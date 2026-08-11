# WA Used Vehicle Market implementation handoff

This branch implements the local and deployable contracts for the isolated WA Used Vehicle Listings estate. The validated source handoff at `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` remains authoritative.

No live source request or cloud mutation is performed by tests, builds, application startup, deployment, or replay.

## Implementation map

- Source, schema, manifest, observation, and quality contracts: `src/lib/vehicle-market/contracts.ts`
- Direct HTTP adapter and strict filter grammar: `src/lib/vehicle-market/autotrader-adapter.ts`
- Immutable local and private Blob evidence stores: `src/lib/vehicle-market/raw-object-store.ts`
- Shared persist-before-parse replay/reconciliation path: `src/lib/vehicle-market/pipeline.ts`
- Gated sequential acquisition and retry policy: `src/lib/vehicle-market/live-acquisition.ts`
- Deterministic dimensional staging and event rules: `src/lib/vehicle-market/analytical-model.ts`
- Neon operational persistence adapter: `src/lib/vehicle-market/operational-store.ts`
- Operator CLI: `scripts/vehicle-market.ts`
- Sanitized evidence and dated probes: `fixtures/vehicle-market/`
- Additive Neon migration: `db/019_vehicle_market_ingestion.sql`
- Managed DuckLake DDL and governed views: `db/ducklake/wa_vehicle_market.sql`
- Transactional staged promotion: `db/ducklake/load_vehicle_market_run.sql`
- WA dataset authority: `src/lib/dataset-definitions/wa-vehicle-market.ts`
- Starter Dives: `src/dives/vehicle-market-atlas.tsx`, `src/dives/vehicle-lens.tsx`, and `src/dives/data-observatory.tsx`

## Commands

Fixture replay, with no source or cloud access:

```powershell
corepack pnpm vehicle:replay -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
```

Private Blob replay, with no source access:

```powershell
$env:BLOB_READ_WRITE_TOKEN='<isolated-private-store-token>'
corepack pnpm vehicle:replay -- --manifest 'https://<store>.private.blob.vercel-storage.com/<run-manifest>.json'
```

Bounded live technical smoke to local evidence only:

```powershell
$env:VEHICLE_MARKET_SOURCE_ENABLED='true'
corepack pnpm vehicle:smoke -- --live --scope fixtures/vehicle-market/scopes/wa-subaru-bounded.json
```

For an approved estate smoke, add `--blob --record-neon` after the isolated private Blob token and WA Neon migration are available.

Full authorised WA Used collection:

```powershell
$env:VEHICLE_MARKET_SOURCE_ENABLED='true'
$env:VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION='true'
corepack pnpm vehicle:collect -- --live --full-wa-used
```

The full command always requires the private Blob token and records the completed operational run in the isolated WA Neon database. A missing gate or credential stops at a human-action checkpoint. It never falls back to local-only evidence.

Inspect a locally retained run:

```powershell
corepack pnpm vehicle:status -- --run <run-id>
```

## Sample local reconciliation

The sanitized two-row fixture produces:

```json
{
  "run_id": "11111111-1111-4111-8111-111111111111",
  "source_total": 2,
  "source_total_start": 2,
  "source_total_end": 2,
  "raw_hits": 2,
  "unique_listing_ids": 2,
  "duplicate_hits": 0,
  "scope_violations": 0,
  "pages_expected": 1,
  "pages_fetched": 1,
  "run_status": "COMPLETE"
}
```

The dated `2026-08-11-wa-used.expected.json` fixture preserves the separately validated 14,749-row, 295-page source behaviour. It is evidence, not a production assertion.

## External release gate

Before creating or applying resources:

```text
HUMAN ACTION REQUIRED

Purpose:
Create and configure the isolated WA Vercel, Neon, private Blob, managed DuckLake, MotherDuck service-account/share, and owner allowlist resources after preserving the VIC deployment.

Action:
Pin or detach the VIC Vercel deployment, confirm the resource boundary and licensing/republication status, then explicitly approve the WA resource-creation step.

Provide:
Approval plus the intended Vercel team/project boundary and confirmation that licensing permits the requested source operation.

Then reply:
ready
```

Public sharing remains disabled independently of source acquisition. Market Movement remains absent until a second adjacent comparable `COMPLETE` observation exists.
