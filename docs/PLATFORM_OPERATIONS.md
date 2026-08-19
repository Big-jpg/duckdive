# Operate DuckDive outside the reviewer path

This reference preserves credentialed and historical operating procedures removed from the root README. These procedures are not part of the engineering-review workflow and do not confirm current external state.

## Require explicit authority

Production deployment, credentials, Neon migrations, Vercel Blob writes, MotherDuck changes, Embedded Dive operations, source acquisition, and destructive data actions require explicit approval. Verify the exact existing resource before running any operator command.

Use `.agents/skills/vic-house-platform-operator/SKILL.md` for the repository-specific platform contract. Never print or commit credentials. Keep the VIC and WA estates isolated.

## Understand the historical VIC pipeline

The retained VIC implementation used this flow:

1. Register each immutable comma-separated values (CSV) file by its SHA-256 hash.
2. Parse one bounded private Blob object through a durable workflow.
3. Store observations in `raw.sale_observation`.
4. Resolve canonical properties and independent sale events.
5. Materialize monthly suburb analytics in Neon.
6. Publish dimensions, facts, and aggregates to `vic_house_data` in MotherDuck.

The historical property key fingerprints a normalized address, state, and postcode. The analytical suburb key remains independent of postcode and preserves observed-postcode lineage.

The historical local sequence used these package scripts:

```bash
pnpm db:migrate
pnpm ingest:local -- --limit=1
pnpm db:status
pnpm ingest:local
pnpm db:reconcile
pnpm publish:motherduck
pnpm smoke:motherduck
pnpm preflight
```

Do not run this sequence during repository review. It requires a verified isolated estate and direct approval for each external mutation.

## Preserve authentication and cost boundaries

The application uses Neon Auth magic links for identity and `app.app_user` for authorization. Authentication never auto-enrols a new member. The `access:add`, `access:revoke`, and `access:list` scripts manage the allowlist without handling passwords.

Neon admits artificial intelligence (AI) requests before a model call. Per-user and global hourly limits fail closed. Anonymous share loads use separate visitor and global limits before MotherDuck session creation, and visitor identity is stored only as a salted SHA-256 hash.

The `/share/*` route is the deliberate anonymous read-only capability. Durable share links never contain MotherDuck tokens or arbitrary Dive identifiers. Embedded session URLs remain short-lived bearer capabilities and must not enter logs, analytics, screenshots, or support records.

## Preserve ingestion boundaries

`POST /api/ingest` accepts an immutable private Blob object and requires `INGEST_SECRET`. The workflow records file metadata while Blob retains the CSV bytes. Missing ingestion authority fails closed.

The historical `rea-sold-scraper` extension owns its browser-session queue, cooldowns, retries, and bounded result-window state. `collection-plan.json` is a retained example, not a current collection instruction.

The ignored local archive and collection directories must remain outside Git. Do not replace immutable source archives with Neon raw tables as the only recovery source.

## Distinguish analytical APIs

The historical VIC analytics routes expose bounded suburb sales and insight queries. They apply explicit valid-price and land-size ranges, include sample sizes, and treat sales velocity as completed sales per month rather than inventory turnover.

The operational-dataset APIs accept structured selections, filters, ordering, and a maximum 500-row limit. They do not accept Structured Query Language (SQL) text. Owner scope, reviewed fields, fixed resource policy, reconciliation state, and revocation checks all fail closed.

## Treat Fabric import and World Health Organization runtime as prototypes

The Fabric import modules validate a local ZIP archive, parse Tabular Model Definition Language (TMDL) evidence, and store only a reviewed semantic contract. They do not persist raw model files, connection strings, or executable Data Analysis Expressions (DAX).

The World Health Organization (WHO) adapter targets only `sample_data.who.ambient_air_quality`. It uses a dedicated service-account selector and exists to test a fixed operational-runtime policy. Live resource and lifecycle smoke scripts require explicit credential and external-state approval.

## Preserve the WA acquisition gates

Fixture replay is the supported reviewer action. Live vehicle access requires `VEHICLE_MARKET_SOURCE_ENABLED=true`; a full WA collection also requires `VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION=true`. Both values default to false.

See `docs/WA_VEHICLE_MARKET_IMPLEMENTATION.md` for the operator command map. The current retention authority prohibits another acquisition during repository review.

## Keep deployment state separate from code

The application configuration targets Vercel’s Sydney region to remain near the historical Neon estate. A successful build does not provision databases, shares, service accounts, credentials, or Embedded Dive entitlements.

Environment pulls can return `[SENSITIVE]` placeholders instead of secret values. Obtain approved credentials through a direct dashboard-to-local handoff when an authorized operation requires them.
