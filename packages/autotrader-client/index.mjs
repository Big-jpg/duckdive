import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const SEARCH_URL = 'https://listings.platform.autotrader.com.au/api/v3/search';
export const PAGE_SIZE = 50;
const filters = {
  make: 'make', model: 'model', yearFrom: 'yearFrom', yearTo: 'yearTo',
  priceFrom: 'priceFrom', priceTo: 'priceTo', fuelType: 'fuel_type',
  transmissionType: 'transmission_type', driveType: 'drive_type', bodyTypeGroup: 'body_type_group',
};
const numericFilters = new Set(['yearFrom', 'yearTo', 'priceFrom', 'priceTo']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function integer(value, name, minimum = 1) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
  return value;
}

export function normalizeScope(input = {}) {
  if (!isRecord(input)) throw new Error('Scope must be an object');
  for (const key of Object.keys(input)) {
    if (!['state', 'condition', ...Object.keys(filters)].includes(key)) throw new Error(`Unsupported filter: ${key}`);
  }
  const scope = { state: 'wa', condition: 'Used', ...input };
  if (typeof scope.state !== 'string' || !['wa', 'nsw', 'vic', 'qld', 'sa', 'tas', 'act', 'nt'].includes(scope.state.toLowerCase())) {
    throw new Error('state must be an Australian state or territory abbreviation');
  }
  scope.state = scope.state.toLowerCase();
  if (!['Used', 'New', 'Demo'].includes(scope.condition)) throw new Error('condition must be Used, New, or Demo');
  for (const key of Object.keys(filters)) {
    if (scope[key] === undefined) { delete scope[key]; continue; }
    if (numericFilters.has(key)) integer(scope[key], key, key.startsWith('year') ? 1886 : 0);
    else {
      if (typeof scope[key] !== 'string' || !scope[key].trim() || scope[key].length > 100) throw new Error(`Invalid ${key}`);
      scope[key] = scope[key].trim();
    }
  }
  for (const prefix of ['year', 'price']) {
    if (scope[`${prefix}From`] > scope[`${prefix}To`]) throw new Error(`${prefix}From must not exceed ${prefix}To`);
  }
  return scope;
}

export function buildSearchUrl(input = {}, page = 1) {
  const scope = normalizeScope(input);
  integer(page, 'page');
  const url = new URL(SEARCH_URL);
  for (const [key, value] of Object.entries({ state: scope.state, condition: scope.condition,
    sortBy: 'listing_created', orderBy: 'asc', paginate: PAGE_SIZE, page })) url.searchParams.set(key, String(value));
  for (const [key, parameter] of Object.entries(filters)) {
    if (scope[key] !== undefined) url.searchParams.set(parameter, String(scope[key]));
  }
  return url.toString();
}

export function parsePage(bytes, expectedPage) {
  const body = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (!isRecord(body)) throw new Error('Source response must be an object');
  for (const key of ['current_page', 'last_page', 'per_page', 'total']) integer(body[key], key, key === 'total' ? 0 : 1);
  if (body.per_page !== PAGE_SIZE) throw new Error(`Source per_page must equal ${PAGE_SIZE}`);
  if (expectedPage !== undefined && body.current_page !== expectedPage) throw new Error('Source current_page does not match requested page');
  if (body.current_page > body.last_page || !Array.isArray(body.data) || body.data.length > PAGE_SIZE) throw new Error('Invalid source pagination shape');
  const listings = body.data.map(hit => {
    if (!isRecord(hit)) throw new Error('Source listing must be an object');
    if ('_source' in hit && !isRecord(hit._source)) throw new Error('Source _source must be an object');
    return hit._source ?? hit;
  });
  return { metadata: { currentPage: body.current_page, lastPage: body.last_page,
    perPage: body.per_page, total: body.total, returned: listings.length }, listings };
}

// Preserve the original transport: native curl, compressed responses, no shell interpolation.
export async function curlTransport(url, { timeoutMs }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'autotrader-http-'));
  const headerPath = path.join(directory, 'headers.txt');
  try {
    const bytes = await new Promise((resolve, reject) => {
      const child = spawn(process.platform === 'win32' ? 'curl.exe' : 'curl', [
        '--silent', '--show-error', '--compressed', '--max-time', String(Math.max(1, Math.ceil(timeoutMs / 1000))),
        '--request', 'GET', '--header', 'accept: application/json', '--dump-header', headerPath, '--output', '-', url,
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const chunks = [];
      child.stdout.on('data', chunk => chunks.push(chunk));
      child.stderr.resume();
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`curl exited with code ${code}`)));
    });
    const blocks = (await readFile(headerPath, 'utf8')).split(/\r?\n\r?\n/).filter(block => /^HTTP\//i.test(block.trim()));
    const lines = blocks.at(-1)?.trim().split(/\r?\n/) ?? [];
    const match = /^HTTP\/\S+\s+(\d{3})\b/i.exec(lines.shift() ?? '');
    if (!match) throw new Error('curl response status is unavailable');
    const headers = new Headers();
    for (const line of lines) {
      const separator = line.indexOf(':');
      if (separator > 0) headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
    return { status: Number(match[1]), headers, bytes };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function fetchTransport(url, { timeoutMs }) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
  return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
}

export class AcquisitionError extends Error {
  constructor(message, summary, cause) {
    super(message, { cause });
    this.name = 'AcquisitionError';
    this.summary = summary;
  }
}

function retryDelay(headers, attempt, delayMs) {
  const value = headers?.get('retry-after');
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(300_000, seconds * 1000);
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return Math.min(300_000, Math.max(0, timestamp - Date.now()));
  }
  return Math.min(30_000, Math.max(1000, delayMs) * 2 ** (attempt - 1));
}

/** Stream pages to a caller-owned sink; retain only listing IDs and run metadata in memory. */
export async function collectListings(options = {}) {
  if (options.allowNetwork !== true) throw new Error('Set allowNetwork: true to explicitly enable source requests');
  if (typeof options.onPage !== 'function') throw new Error('onPage callback is required');
  const scope = normalizeScope(options.scope);
  const maxPages = options.maxPages === undefined ? 1 : options.maxPages;
  if (maxPages !== null) integer(maxPages, 'maxPages');
  const delayMs = integer(options.delayMs ?? 1000, 'delayMs', 0);
  const timeoutMs = integer(options.timeoutMs ?? 30_000, 'timeoutMs');
  const maxAttempts = integer(options.maxAttempts ?? 3, 'maxAttempts');
  const transport = options.transport ?? curlTransport;
  const pause = options.sleep ?? sleep;
  const summary = { scope, startedAt: new Date().toISOString(), completedAt: null, status: 'PARTIAL',
    sourceTotalStart: null, sourceTotalEnd: null, pagesExpected: 0, pagesFetched: 0,
    rawHits: 0, uniqueListingIds: 0, duplicateHits: 0, missingListingIds: 0,
    populationChanged: false, firstPageChanged: false, requests: [], errors: [] };
  const seen = new Set();
  let baseline;
  let baselineHash;

  async function requestPage(page, role) {
    const url = buildSearchUrl(scope, page);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const requestedAt = new Date().toISOString();
      let response;
      try { response = await transport(url, { timeoutMs }); }
      catch (error) {
        summary.requests.push({ page, role, attempt, url, requestedAt, status: null, sha256: null });
        if (attempt === maxAttempts) throw error;
        await pause(retryDelay(null, attempt, delayMs));
        continue;
      }
      const bytes = Buffer.from(response.bytes);
      const entry = { page, role, attempt, url, requestedAt, status: response.status, sha256: hash(bytes) };
      summary.requests.push(entry);
      // Sink errors are fatal; retrying a sink could duplicate writes or hide missing raw evidence.
      await options.onResponse?.({ ...entry, bytes });
      if (response.status >= 200 && response.status < 300) return parsePage(bytes, page);
      if ((response.status !== 429 && response.status < 500) || attempt === maxAttempts) {
        throw new Error(`Source returned HTTP ${response.status} on page ${page}`);
      }
      await pause(retryDelay(response.headers, attempt, delayMs));
    }
  }

  try {
    const first = await requestPage(1, 'capture');
    baseline = first.metadata;
    baselineHash = hash(JSON.stringify(first.listings));
    summary.sourceTotalStart = baseline.total;
    summary.pagesExpected = baseline.lastPage;
    const limit = maxPages === null ? baseline.lastPage : Math.min(maxPages, baseline.lastPage);
    for (let pageNumber = 1; pageNumber <= limit; pageNumber++) {
      if (pageNumber > 1) await pause(delayMs);
      const page = pageNumber === 1 ? first : await requestPage(pageNumber, 'capture');
      const metadata = page.metadata;
      if (metadata.total !== baseline.total || metadata.lastPage !== baseline.lastPage) summary.populationChanged = true;
      for (const listing of page.listings) {
        const id = listing.id ?? listing.listing_id;
        if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') summary.missingListingIds++;
        else if (seen.has(String(id))) summary.duplicateHits++;
        else seen.add(String(id));
      }
      await options.onPage({ ...page, pageNumber, url: buildSearchUrl(scope, pageNumber) });
      summary.pagesFetched++;
      summary.rawHits += page.listings.length;
    }
    await pause(delayMs);
    const probe = await requestPage(1, 'consistency_probe');
    summary.sourceTotalEnd = probe.metadata.total;
    summary.populationChanged ||= probe.metadata.total !== baseline.total || probe.metadata.lastPage !== baseline.lastPage;
    summary.firstPageChanged = hash(JSON.stringify(probe.listings)) !== baselineHash;
    if (summary.pagesFetched < summary.pagesExpected) summary.status = 'PARTIAL';
    else if (summary.duplicateHits || summary.missingListingIds) summary.status = 'INVALID';
    else if (summary.populationChanged || summary.firstPageChanged) summary.status = 'CHANGED_DURING_CAPTURE';
    else if (summary.rawHits !== baseline.total || seen.size !== baseline.total) {
      summary.status = 'INVALID';
      summary.errors.push('Captured listing counts do not reconcile to the source total');
    } else summary.status = 'COMPLETE';
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error));
    throw new AcquisitionError('Acquisition stopped; any written output is incomplete', summary, error);
  } finally {
    summary.uniqueListingIds = seen.size;
    summary.completedAt = new Date().toISOString();
  }
  return summary;
}
