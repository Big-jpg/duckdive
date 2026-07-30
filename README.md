# VIC House Data Lab

An experimental, open analytical experience for Victorian detached-house sales. Immutable CSV sources flow through Neon Postgres canonical records into MotherDuck OLAP tables and three embedded, AI-remixable Dives.

The VIC estate is intentionally isolated from the historical WA deployment. Point every database environment variable at a dedicated VIC Neon project before running migrations or ingestion.

## Data flow

1. A CSV is registered in `ops.ingest_file` by SHA-256. The immutable local VIC archive is the bulk-load source; private Vercel Blob remains available for incremental HTTP ingestion.
2. A durable workflow parses one bounded file and idempotently lands observations in `raw.sale_observation`.
3. `core.curate_file` selects the best listing observation and resolves it to a canonical property.
4. `core.sale_event` preserves transactions independently of listing identity.
5. `mart.suburb_monthly_sales` serves common application reads from Neon.
6. `scripts/publish-motherduck.ts` atomically publishes dimensions, aggregates, and sale facts to `vic_house_data`, then creates or updates an automatic, read-only organization share.

The current property key is a SHA-256 fingerprint of normalized address, state, and postcode. It is marked as `NORMALIZED_ADDRESS` with a confidence of `0.9000`; authoritative parcel/title identifiers can later be attached without changing `property_id` references. Analytical suburb identity is independent of postcode: `mart.suburb_dimension` assigns a state-qualified normalized `suburb_key`, retains every observed postcode for lineage, and selects the sales-weighted modal postcode as display metadata. Monthly suburb statistics are recomputed from individual sale events at `suburb_key × sale_month` grain.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm test
pnpm ingest:local -- --limit=1
pnpm db:status
pnpm ingest:local
pnpm db:reconcile
pnpm publish:motherduck
pnpm smoke:motherduck
pnpm preflight
EDITOR_PASSWORD='a-long-one-time-password' pnpm editor:create -- editor@example.com
```

Archive the historical CSV source with a separate ignored environment file so Neon credentials in `.env.local` are not overwritten. Locally minted Vercel OIDC tokens carry a `development` environment claim even when Production variables are pulled, so the Blob store must allow the Development connection (or `.env.blob` must contain a dedicated read/write token):

```bash
vercel env pull .env.blob --environment=production
pnpm archive:blob
```

Standalone database scripts load `.env.local` explicitly. Vercel deliberately downloads variables marked Sensitive as the literal value `[SENSITIVE]`; neither `vercel env pull` nor `vercel env run` can recover those values for a local migration. Copy the pooled and direct connection strings from the isolated Neon project's **Connect** panel into `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env.local`, then run `pnpm db:migrate`. Keep the Vercel variables marked Sensitive: production builds and Functions receive their real values.

## HTTP ingestion

Upload an immutable CSV to Vercel Blob, then call `POST /api/ingest` with `Authorization: Bearer $INGEST_SECRET`:

```json
{"fileName":"rea-sold-ABERFELDIE-VIC-_3040_.csv","objectUrl":"https://...blob.vercel-storage.com/raw/...csv","expectedSha256":"optional-64-character-checksum"}
```

The route returns `202` and a Vercel Workflow run ID. The Workflow state contains only file metadata; CSV bytes remain in Blob.
If `INGEST_SECRET` is not configured, the route fails closed with HTTP 503.

## Metadata-driven extension collection

The Chrome extension in `rea-sold-scraper` owns the raw collection queue inside the user's normal browser session. Jobs can be added through the popup or imported from a JSON collection plan. Supported slice metadata includes suburb/state/postcode, property type, bedroom and price bounds, REA's relative sold-age filter, exact client-side sold-date bounds, and surrounding-suburb behavior.

REA's sold-search result window is treated as deliberately bounded: page 80 / 2,000 visible results is a successful completion with `result_window_reached` recorded as its reason. Extension state, cooldowns, retries, page progress, and slice metadata persist in `chrome.storage.local` across service-worker restarts.

## Analytics API

`GET /api/analytics/suburb-sales` queries the MotherDuck monthly mart. Preferred parameters are `suburb_key`, `from`, `to`, and `limit`; `suburb` and `postcode` remain available for compatibility.

`GET /api/analytics/suburb-insights` accepts `suburb_key`, `from`, and `to`. It queries the curated MotherDuck sale fact table for rolling 12-month and prior-year medians, explicit sample sizes, land-to-price correlation, plausible median land size, and bedroom-segment medians over the visitor's selected period.

The public gallery provisions secure, read-only Embedded Dives. Pre-provisioned editors receive isolated Dive IDs and chat history while a controlled MotherDuck service account supplies compute and read-only access to the automatic organization share.

Editors can publish an individual personal Dive as an unlisted, view-only `/share/<slug>` link. The 80-bit capability slug resolves through `app.dive_share`; the server verifies ownership, active/revoked state, and optional expiry before minting a fresh short-lived MotherDuck embed session. Durable links never contain MotherDuck tokens or expose arbitrary Dive IDs. Revocation takes effect immediately and returns HTTP 404 for the old slug.

The production lifecycle smoke harness uses a temporary `.invalid` QA owner and the existing source Suburb Story without modifying the source Dive:

```bash
pnpm smoke:share create
pnpm smoke:share revoke
pnpm smoke:share cleanup
```

The API uses one versioned analytics contract: all observations count toward volume, while price statistics use reported values from AUD 50,000 through AUD 20,000,000 and land statistics use 50 through 10,000 m². Responses include these definitions and explicit valid-sample counts. `suburb-insights` compares a requested period with the immediately preceding period of equal inclusive length.

Sales velocity is defined as completed detached-house sales per month over the latest rolling 12 months. Its comparison is the percentage change in completed sale count versus the immediately preceding 12 months; it is not an inventory-turnover or days-on-market measure.

```text
/api/analytics/suburb-sales?suburb=Yarraville&from=2020-01-01
```

## Baseline reconciliation

The immutable VIC archive contains 83 source files and 88,422 source rows dated 2004-09-14 through 2026-07-18. `pnpm reconcile` checks those invariants alongside database counts. Unpriced sales remain in volume metrics and are excluded only from price statistics; any remaining discrepancy must be explained by an explicit quality rule rather than silent deletion.

## Production notes

- Co-locate Vercel Functions, Neon, and MotherDuck as closely as available.
- Use `DATABASE_URL_UNPOOLED` for migrations/ingestion, `DATABASE_URL` for pooled application traffic, and optionally `DATABASE_READ_URL` for read-only publication and stats queries.
- The historical archive is intentionally supported by the idempotent local bulk driver; incremental files can use Vercel Workflow.
- Keep the raw CSV archive immutable. Do not use Neon raw tables as the only recovery source.
- Embedded Dives website sessions require the appropriate MotherDuck Business or Enterprise entitlement. Keep admin, service-account, and Neon direct credentials server-only.
- Run `pnpm preflight` against the production environment before deploying. A successful code build does not provision the isolated Neon project, MotherDuck share, service account, or Embedded Dives entitlement.
