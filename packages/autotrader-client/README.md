# Autotrader acquisition client

A standalone, dependency-free Node.js package extracted from DuckDive's working Autotrader Australia acquisition flow. Use it in another project without Next.js, Neon, Vercel Blob, MotherDuck, or DuckDive environment variables. Requires Node.js 22 or later and native `curl` on PATH for the default transport.

## Take it to the other project

Copy this entire directory into the other project, or install the locally supplied archive:

```sh
npm install /absolute/path/to/duckdive-autotrader-client-0.1.0.tgz
```

The package is private and is not published to a registry. It includes JavaScript, TypeScript declarations, a CLI, and this guide. No credentials or captured vehicle data are included. The repository's existing license/provenance position remains unchanged; no new open-source license is granted.

## Build your own dataset

```js
import { collectListings } from '@duckdive/autotrader-client';

const summary = await collectListings({
  allowNetwork: true,
  scope: { state: 'wa', condition: 'Used', make: 'Toyota' },
  maxPages: 2, // Omit for one page; use null to explicitly collect every page.
  onPage: async ({ listings, metadata }) => {
    // Full source objects are preserved: your project owns field mapping and storage.
    await yourDataset.write(listings.map(row => ({
      listingId: row.id ?? row.listing_id,
      make: row.make,
      model: row.model,
      source: row,
    })));
    console.log(metadata.currentPage, metadata.lastPage);
  },
});
console.log(summary);
```

`yourDataset` represents your project's sink. Page callbacks are awaited, providing backpressure. The client retains only IDs and request metadata between pages, so large captures do not accumulate full listings in memory. All record occurrences are delivered; your sink chooses its own duplicate resolution policy. `_source` wrappers are unwrapped; the raw HTTP body remains available through `onResponse`.

## Command-line export

Create a `scope.json`:

```json
{ "state": "wa", "condition": "Used", "make": "Toyota", "yearFrom": 2018 }
```

Run a bounded capture, using a new output directory each time:

```sh
node cli.mjs --scope scope.json --out ./capture-001 --max-pages 2 --allow-network
```

After installing the archive, `autotrader-export` exposes the same CLI. To request the whole selected population, replace `--max-pages 2` with `--all`. Default delay is 1,000 ms between pages; `--delay-ms` adjusts it. The directory's parent must exist. Existing output directories are refused.

Outputs:

- `listings.ndjson`: one full source listing per line, streamed page by page.
- `raw/`: immutable response bodies, including failed HTTP responses and the final consistency probe, named by role, page, attempt, and SHA-256.
- `summary.json`: scope, request URLs/timestamps/hashes, page counts, IDs, duplicates, source totals, changes, errors, and run status.

The probe is never appended to the dataset. Exit code 0 means `COMPLETE`, 2 means a finished capture with a non-complete quality status (including an intentional page limit), and 1 means a failed capture. Written data may remain after a failure; always inspect the summary before consuming it.

## API and pagination contract

The endpoint is `https://listings.platform.autotrader.com.au/api/v3/search`. Requests use `paginate=50`, `sortBy=listing_created`, `orderBy=asc`, and one-based `page`. The first response establishes `last_page`; pages are fetched sequentially to that initial boundary, followed by a fresh page-one request. Growing populations are reported as changed rather than chased indefinitely.

Scope defaults to WA Used. Configurable inputs are `state`, `condition`, `make`, `model`, `yearFrom`, `yearTo`, `priceFrom`, `priceTo`, `fuelType`, `transmissionType`, `driveType`, and `bodyTypeGroup`. The last four map to the existing snake-case source parameters. Unknown filters are rejected. Page size and ordering are fixed to the proven strategy. Other states and New/Demo conditions are configuration extensions, not live-verified claims; WA Used is the historical working scope. This package does not enforce DuckDive's analytical cohort rules or independently validate every returned listing against the requested filters.

Retries cover transport failures, HTTP 429, and HTTP 5xx, with three attempts by default, a 30-second request timeout, and exponential backoff. `Retry-After` is respected up to five minutes. Other HTTP failures, malformed payloads, and sink failures stop the run. `onResponse` is awaited before parsing or retrying; use it when your project needs raw response retention. The CLI always retains raw responses.

`COMPLETE` requires every expected page, the final probe, matching counts, unique IDs, and no detected change. `PARTIAL` indicates a page limit or interrupted acquisition. `INVALID` indicates missing IDs, duplicates, or stable count mismatch. `CHANGED_DURING_CAPTURE` indicates changed pagination totals or changed page-one records. A page-one probe cannot prove snapshot isolation: changes elsewhere with unchanged counts may remain undetected.

`AcquisitionError.summary` contains progress on failure. Callbacks should use idempotent writes if your application will restart a capture. Resume/checkpoint handling and scheduling belong to the consuming project.

Default transport deliberately uses native curl, as the existing acquisition does. To use Node fetch instead, pass `transport: fetchTransport`; compatibility with the source has not been live-verified here. Custom transports must honor `timeoutMs` and return `{ status, headers, bytes }`. Inject `transport` and `sleep` for offline tests. Importing the module or running `--help` makes no requests. Acquiring data requires `allowNetwork: true` or CLI `--allow-network`; copying this package does not enable DuckDive's source gates.

## Provenance and offline verification

Derived from `src/lib/vehicle-market/autotrader-adapter.ts`, `live-acquisition.ts`, and the quality checks in `pipeline.ts`. Extraction preserves the source endpoint, filter mappings, 50-row page strategy, curl transport, pacing, retries, and end probe. It replaces WA-specific storage/model dependencies with caller-owned callbacks and adds explicit page limits and first-page change detection. The original DuckDive pipeline remains untouched.

Run `node --test test/*.node-test.mjs` from the source directory in DuckDive. Tests use generated responses and a local HTTP server and do not contact Autotrader. Run `node pack.mjs` there to regenerate the installable archive in DuckDive's ignored `dist/` directory; this requires `tar` on PATH. Development tests and the packaging helper are excluded from the archive. The package contains no acquired dataset. Packaging and verification do not assert current endpoint availability or authorize another collection in DuckDive.
