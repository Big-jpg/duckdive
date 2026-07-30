# Operations Runbook

## Validate and load Neon

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec tsx scripts/profile-data.ts rea_sales_data_model/VIC
pnpm db:migrate
pnpm ingest:local -- rea_sales_data_model/VIC --limit=1
pnpm ingest:local -- rea_sales_data_model/VIC
pnpm db:status
pnpm db:reconcile
```

Obtain current URLs from `neon-vic-house-data`. Keep them ignored or process-local. Loading is idempotent; inspect manifest state instead of deleting partial data.

## Archive to private Blob

Archive after Neon manifests exist. Pull OIDC into separate ignored `.env.blob` so `.env.local` is not overwritten. Vercel locally mints the OIDC token with a `development` claim even when Production variables are selected; ensure the Blob store permits the project's Development connection, or place a dedicated Blob read/write token only in `.env.blob`.

```powershell
vercel env pull .env.blob --environment=production
$env:VERCEL_ENV_FILE='.env.blob'
pnpm archive:blob -- rea_sales_data_model/VIC
```

Objects are private and content-addressed as `raw/realestate.com.au/<sha256>.csv`.

## Publish MotherDuck

Confirm the admin token belongs to the Business-enabled organization, then run:

```powershell
pnpm publish:motherduck
pnpm smoke:motherduck
```

Retrieve the `vic_house_data_app` `md:_share/...` URL and configure `MOTHERDUCK_SHARE_URL` in Vercel. On service-account quota 403, verify organization/token scope and entitlement propagation; do not weaken isolation.

## Deploy and verify

Configure at least one AI provider credential, then run `pnpm preflight`, deploy with `vercel deploy --prod`, and inspect `vercel logs vic-house-data-lab.vercel.app --since 10m --no-follow`.

The release gate requires non-zero `/api/stats`, populated analytics routes, three gallery Dives with embed sessions, passing tests/lint/typecheck/build/reconcile/MotherDuck smoke/preflight, and a clean Git status without secrets or generated datasets.

For share-link releases, run `pnpm smoke:share create`, open the emitted slug anonymously and verify the Dive renders without query errors, then run `pnpm smoke:share revoke` and verify the same URL returns 404. Always finish with `pnpm smoke:share cleanup`; it targets only `qa-share-link@invalid.local` and its cascaded Neon rows.

Treat Vercel `Ready` as a build signal only. Rerun idempotent operations before inventing repair SQL; preserve hashes and manifest history; publish through `_next` tables and atomic renames.
