import test from 'node:test';
import assert from 'node:assert/strict';
import { collectListings, buildSearchUrl, parsePage, AcquisitionError } from '../index.mjs';

const listing = id => ({ id, make: 'Toyota', customField: { retained: true } });
const pageBody = (page, last, total, listings) => Buffer.from(JSON.stringify({
  current_page: page, last_page: last, per_page: 50, total,
  data: listings.map(row => ({ _source: row })),
}));
const ok = bytes => ({ status: 200, headers: new Headers(), bytes });
const noSleep = async () => {};
const options = extra => ({ allowNetwork: true, onPage: async () => {}, sleep: noSleep, ...extra });

test('URL preserves the existing endpoint, order, pagination, and filter mappings', () => {
  const url = new URL(buildSearchUrl({ state: 'vic', make: 'Land Rover', priceFrom: 0, fuelType: 'Diesel' }, 295));
  assert.equal(url.origin + url.pathname, 'https://listings.platform.autotrader.com.au/api/v3/search');
  assert.equal(url.searchParams.get('paginate'), '50');
  assert.equal(url.searchParams.get('sortBy'), 'listing_created');
  assert.equal(url.searchParams.get('orderBy'), 'asc');
  assert.equal(url.searchParams.get('page'), '295');
  assert.equal(url.searchParams.get('make'), 'Land Rover');
  assert.equal(url.searchParams.get('fuel_type'), 'Diesel');
  assert.equal(url.searchParams.get('priceFrom'), '0');
  assert.throws(() => buildSearchUrl({ kmsFrom: 1 }), /Unsupported/);
  assert.throws(() => buildSearchUrl({ yearFrom: 2020, yearTo: 2010 }), /must not exceed/);
  assert.throws(() => buildSearchUrl({}, 0), /page/);
});

test('parses wrapped and direct listings without discarding custom source fields', () => {
  const body = { current_page: 1, last_page: 1, per_page: 50, total: 2, data: [{ _source: listing(1) }, listing(2)] };
  assert.deepEqual(parsePage(Buffer.from(JSON.stringify(body)), 1).listings, [listing(1), listing(2)]);
  assert.throws(() => parsePage(Buffer.from('{}')), /current_page/);
  assert.throws(() => parsePage(pageBody(2, 2, 2, []), 1), /does not match/);
  assert.throws(() => parsePage(Buffer.from(JSON.stringify({ ...body, per_page: 25 }))), /per_page/);
});

test('streams all expected pages, preserves backpressure, and probes without emitting probe data', async () => {
  const first = pageBody(1, 2, 51, Array.from({ length: 50 }, (_, index) => listing(index + 1)));
  const second = pageBody(2, 2, 51, [listing(51)]);
  const events = [];
  const summary = await collectListings(options({ maxPages: null,
    transport: async url => { const page = Number(new URL(url).searchParams.get('page')); events.push(`request:${page}`); return ok(page === 1 ? first : second); },
    onResponse: async response => { assert.equal(response.sha256.length, 64); events.push(`raw:${response.role}`); },
    onPage: async page => { await Promise.resolve(); events.push(`write:${page.pageNumber}`); },
  }));
  assert.equal(summary.status, 'COMPLETE');
  assert.equal(summary.rawHits, 51);
  assert.equal(summary.uniqueListingIds, 51);
  assert.deepEqual(events, ['request:1', 'raw:capture', 'write:1', 'request:2', 'raw:capture', 'write:2', 'request:1', 'raw:consistency_probe']);
});

test('defaults to one page and labels bounded captures partial', async () => {
  const requested = [];
  const summary = await collectListings(options({ transport: async url => {
    requested.push(new URL(url).searchParams.get('page'));
    return ok(pageBody(1, 3, 120, [listing(1)]));
  } }));
  assert.equal(summary.status, 'PARTIAL');
  assert.deepEqual(requested, ['1', '1']);
});

test('retries 429 with Retry-After and archives every HTTP response', async () => {
  const delays = [];
  const statuses = [];
  let count = 0;
  const summary = await collectListings(options({ sleep: async delay => { delays.push(delay); },
    transport: async () => ++count === 1
      ? { status: 429, headers: new Headers({ 'retry-after': '2' }), bytes: Buffer.from('rate limited') }
      : ok(pageBody(1, 1, 1, [listing(1)])),
    onResponse: async response => { statuses.push(response.status); },
  }));
  assert.equal(summary.status, 'COMPLETE');
  assert.deepEqual(statuses, [429, 200, 200]);
  assert.deepEqual(delays, [2000, 1000]);
});

test('network errors retry; 403 fails immediately and carries partial evidence', async () => {
  let calls = 0;
  const summary = await collectListings(options({ transport: async () => {
    if (++calls === 1) throw new Error('timeout');
    return ok(pageBody(1, 1, 0, []));
  } }));
  assert.equal(summary.status, 'COMPLETE');
  assert.equal(summary.requests[0].status, null);
  calls = 0;
  await assert.rejects(collectListings(options({ transport: async () => {
    calls++; return { status: 403, headers: new Headers(), bytes: Buffer.from('denied') };
  } })), error => error instanceof AcquisitionError && error.summary.status === 'PARTIAL' && Boolean(error.summary.completedAt));
  assert.equal(calls, 1);
});

test('detects changed totals and page-one records even with unchanged population size', async () => {
  for (const changedTotal of [true, false]) {
    let calls = 0;
    const summary = await collectListings(options({ transport: async () => {
      const probe = ++calls > 1;
      return ok(pageBody(1, 1, probe && changedTotal ? 2 : 1, [listing(probe ? 2 : 1)]));
    } }));
    assert.equal(summary.status, 'CHANGED_DURING_CAPTURE');
    assert.equal(summary.populationChanged, changedTotal);
    assert.equal(summary.firstPageChanged, true);
  }
});

test('duplicates, missing IDs, and stable count mismatches are invalid', async () => {
  for (const [rows, total] of [[[listing(1), listing(1)], 2], [[{ make: 'Toyota' }], 1], [[listing(1)], 2]]) {
    const summary = await collectListings(options({ transport: async () => ok(pageBody(1, 1, total, rows)) }));
    assert.equal(summary.status, 'INVALID');
  }
});

test('sink errors and malformed responses stop without retrying the sink', async () => {
  let calls = 0;
  await assert.rejects(collectListings(options({ transport: async () => { calls++; return ok(pageBody(1, 1, 1, [listing(1)])); },
    onResponse: async () => { throw new Error('disk full'); },
  })), /incomplete/);
  assert.equal(calls, 1);
  await assert.rejects(collectListings(options({ transport: async () => ok(Buffer.from('<html>blocked</html>')) })), AcquisitionError);
});

test('explicit network opt-in and valid limits are required before requests', async () => {
  let calls = 0;
  const transport = async () => { calls++; throw new Error('must not run'); };
  await assert.rejects(collectListings({ transport, onPage: async () => {} }), /allowNetwork/);
  await assert.rejects(collectListings(options({ transport, maxPages: 0 })), /maxPages/);
  assert.equal(calls, 0);
});

test('failed later pages and failed probes retain progress and never claim completeness', async () => {
  for (const failProbe of [true, false]) {
    let calls = 0;
    const first = pageBody(1, failProbe ? 1 : 2, failProbe ? 1 : 51, [listing(1)]);
    await assert.rejects(collectListings(options({ maxPages: null, maxAttempts: 2,
      transport: async () => ++calls === 1 ? ok(first) : { status: 503, headers: new Headers(), bytes: Buffer.from('unavailable') },
    })), error => {
      assert.equal(error.summary.status, 'PARTIAL');
      assert.equal(error.summary.pagesFetched, 1);
      assert.equal(error.summary.rawHits, 1);
      assert.equal(error.summary.requests.length, 3);
      assert.equal(error.summary.requests.at(-1).role, failProbe ? 'consistency_probe' : 'capture');
      return true;
    });
  }
});
