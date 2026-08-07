#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRAPER_DIR = path.join(ROOT, "rea-sold-scraper");
const DEFAULT_PLAN = path.join(ROOT, "collection-plan.json");

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--") continue;
  if (!arg.startsWith("--")) continue;
  const [key, inline] = arg.slice(2).split("=", 2);
  args.set(key, inline ?? process.argv[++i] ?? "true");
}

const planPath = path.resolve(args.get("plan") || DEFAULT_PLAN);
const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const outputDir = path.resolve(args.get("output") || plan.outputDirectory || "rea-collections");
const profileDir = path.resolve(args.get("profile") || plan.profileDirectory || ".rea-collector/chromium-profile");
const headless = args.get("headed") !== "true";
const delayBetweenPagesMs = Number(args.get("delay") ?? plan.delayBetweenPagesMs ?? 5000);
const targetRecordsPerSecond = Math.min(45, Math.max(1, Number(args.get("recordsPerSecond") ?? 45)));
const maxPages = Math.min(80, Math.max(1, Number(args.get("maxPages") ?? 80)));
const retryLimit = Math.min(5, Math.max(1, Number(args.get("retries") ?? 3)));

if (!Array.isArray(plan.slices) || plan.slices.length === 0) throw new Error("Plan has no slices");
if (!Number.isFinite(delayBetweenPagesMs) || delayBetweenPagesMs < 0) throw new Error("Invalid delay");
console.error(`[start] plan=${planPath} slices=${plan.slices.length} maxPages=${maxPages} restart=${args.get("restart") || "false"}`);

await fs.mkdir(outputDir, { recursive: true });

const loadBrowserHelpers = async (file, globalName) => {
  const source = await fs.readFile(path.join(SCRAPER_DIR, file), "utf8");
  const context = { console, setTimeout, clearTimeout, URL, URLSearchParams };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: file });
  if (!context[globalName]) throw new Error(`${file} did not expose ${globalName}`);
  return context[globalName];
};

const sliceHelpers = await loadBrowserHelpers("slice.js", "ReaSlice");
const contentSource = await fs.readFile(path.join(SCRAPER_DIR, "content.js"), "utf8");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const jitteredDelay = (ms) => Math.max(0, Math.round(ms * (0.8 + Math.random() * 0.4)));
const recordKey = (r) => `${r.address}|${r.soldDate}|${r.priceValue}|${r.bedrooms}|${r.bathrooms}|${r.carSpaces}|${r.landSizeSqm}`;

// Reserve a conservative 50-record page slot. This keeps the worst-case
// response rate under the configured budget even before the page is parsed.
class RecordRateLimiter {
  constructor(recordsPerSecond) {
    this.minIntervalMs = Math.ceil(1000 * 50 / recordsPerSecond);
    this.nextAllowedAt = 0;
  }

  async wait() {
    const waitMs = this.nextAllowedAt - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    this.nextAllowedAt = Date.now() + this.minIntervalMs;
  }
}

let parserReady = false;
const parsePage = async (page, url, pageNumber) => {
  // Match the working extension: fetch the HTML from a realestate.com.au
  // page context, then parse the response HTML. Navigating directly to every
  // result URL can produce a different server response in headless Chrome.
  if (!parserReady) {
    await page.goto("https://www.realestate.com.au/sold/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.addScriptTag({ content: contentSource });
    parserReady = true;
  }
  const result = await page.evaluate(async ({ pageNumber, url }) => {
    if (!globalThis.ReaContent) throw new Error("Parser was not loaded");
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    const html = await response.text();
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      return {
        rateLimited: true,
        retryAfterMs: Number.isFinite(retryAfter) ? Math.max(30_000, retryAfter * 1000) : null,
      };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const bodyText = doc.body?.innerText || doc.body?.textContent || "";
    if (/captcha|robot|access denied|too many requests|unusual traffic/i.test(bodyText)) {
      throw new Error("Site returned a bot/rate-limit challenge");
    }
    return {
      ...globalThis.ReaContent.parseDocument(doc, pageNumber, url),
      htmlLength: html.length,
      cardCount: doc.querySelectorAll("div.residential-card__content").length,
    };
  }, { pageNumber, url });

  if (result.cardCount === 0 && result.records.length === 0) {
    throw new Error(`No result cards in ${result.htmlLength}-byte HTML response`);
  }
  return result;
};

const checkpointPaths = (slice) => {
  const id = sliceHelpers.makeSliceId(slice);
  return {
    id,
    state: path.join(outputDir, `${id}.state.json`),
    records: path.join(outputDir, `${id}.jsonl`),
  };
};

const loadCheckpoint = async (slice) => {
  const paths = checkpointPaths(slice);
  try {
    const state = JSON.parse(await fs.readFile(paths.state, "utf8"));
    const lines = await fs.readFile(paths.records, "utf8").catch(() => "");
    const records = lines.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    if (args.get("restart") === "true") {
      await fs.writeFile(paths.records, "", "utf8");
      return { paths, state: { page: 0, status: "pending", totalResults: null }, records: [] };
    }
    return { paths, state, records };
  } catch {
    return { paths, state: { page: 0, status: "pending", totalResults: null }, records: [] };
  }
};

const saveState = (file, state) => fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");

const scrapeSlice = async (page, slice, limiter) => {
  const checkpoint = await loadCheckpoint(slice);
  if (checkpoint.state.status === "complete" && args.get("restart") !== "true") {
    console.log(`[skip] ${slice.name || slice.suburb} already complete (${checkpoint.records.length} records)`);
    return checkpoint.records;
  }

  const seen = new Set(checkpoint.records.map(recordKey));
  const records = [...checkpoint.records];
  let consecutiveDuplicates = 0;
  let pageNumber = checkpoint.state.page + 1;
  const state = { ...checkpoint.state, status: "running" };
  await saveState(checkpoint.paths.state, state);

  try {
    for (; pageNumber <= maxPages; pageNumber++) {
      await limiter.wait();
      const url = sliceHelpers.buildUrl(slice, pageNumber);
      let result;
      let lastError;
      for (let attempt = 1; attempt <= retryLimit; attempt++) {
        try {
          result = await parsePage(page, url, pageNumber);
          if (result.rateLimited) {
            if (attempt === retryLimit) throw new Error("HTTP 429 rate limited; retry budget exhausted");
            const schedule = [30_000, 60_000, 120_000];
            const backoff = result.retryAfterMs || schedule[attempt - 1] || 120_000;
            console.warn(`[rate-limit] ${slice.name || slice.suburb} page ${pageNumber}: waiting ${backoff}ms before retry ${attempt + 1}/${retryLimit}`);
            await sleep(backoff);
            continue;
          }
          break;
        } catch (error) {
          lastError = error;
          if (attempt === retryLimit) throw lastError;
          const backoff = Math.min(120_000, 5_000 * 2 ** (attempt - 1));
          console.warn(`[retry] ${slice.name || slice.suburb} page ${pageNumber}: ${error.message}; waiting ${backoff}ms`);
          await sleep(backoff);
        }
      }

      const newRecords = [];
      for (const record of result.records || []) {
        if (!sliceHelpers.recordInDateRange(record, slice)) continue;
        record.sliceId = checkpoint.paths.id;
        record.sliceName = slice.name || slice.suburb;
        record.planRunId = plan.runId || null;
        if (!seen.has(recordKey(record))) {
          seen.add(recordKey(record));
          records.push(record);
          newRecords.push(record);
        }
      }
      if (newRecords.length) {
        await fs.appendFile(checkpoint.paths.records, newRecords.map(r => `${JSON.stringify(r)}\n`).join(""), "utf8");
        consecutiveDuplicates = 0;
      } else {
        consecutiveDuplicates++;
      }

      state.page = pageNumber;
      state.totalResults = result.totalResults ?? state.totalResults;
      state.records = records.length;
      state.lastPageRecords = result.records?.length || 0;
      await saveState(checkpoint.paths.state, state);
      console.log(`[page] ${slice.name || slice.suburb} ${pageNumber}: ${result.records?.length || 0} parsed from ${result.cardCount ?? "?"} cards, ${newRecords.length} new, ${records.length} total`);

      const ceiling = state.totalResults ? Math.ceil(state.totalResults / 25) : null;
      if (result.empty || consecutiveDuplicates >= 3 || (ceiling && pageNumber >= ceiling)) break;
      await sleep(jitteredDelay(delayBetweenPagesMs));
    }
    state.status = "complete";
    state.completedAt = new Date().toISOString();
    await saveState(checkpoint.paths.state, state);
    return records;
  } catch (error) {
    state.status = "paused";
    state.error = error.message;
    await saveState(checkpoint.paths.state, state);
    throw error;
  }
};

let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
    args: ["--disable-blink-features=AutomationControlled"],
  });
} catch (error) {
  if (/executable doesn't exist|Executable doesn't exist/i.test(error.message)) {
    throw new Error("Playwright Chromium is not installed. Run: corepack pnpm exec playwright install chromium");
  }
  throw error;
}
const page = await context.newPage();
const limiter = new RecordRateLimiter(targetRecordsPerSecond);

try {
  for (const source of plan.slices) {
    const slice = {
      ...source,
      stateAbbr: source.stateAbbr || source.state,
      includeSurrounding: source.includeSurrounding === true,
    };
    try {
      await scrapeSlice(page, slice, limiter);
    } catch (error) {
      console.error(`[error] ${slice.name || slice.suburb}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await context.close();
}
