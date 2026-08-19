# WA Used Vehicle Market implementation handoff

This branch implements a WA Used Vehicle Listings lens on top of the existing DuckDive infrastructure. The versioned contracts, tests, and sanitized fixtures in this repository define the reviewable source behaviour and data invariants. Operator material outside the repository is not a reviewer dependency.

The experiment remains private and restricted to existing approved users. On 2026-08-19, the owner superseded the former 2026-08-18 disposal deadline and directed that the retained evidence must not be fully flattened or deleted. Public sharing remains disabled.

No live source request or cloud mutation is performed by tests, builds, application startup, deployment, or replay.

## Infrastructure boundary

Reuse the existing:

- Vercel team, `vic-house-data-lab` project, and `duckdive.gold` domain;
- Neon project, authentication, allowlist, migrations, and application schemas;
- private Vercel Blob store, under the dedicated `vehicle-market/source=autotrader/market=wa-used/` prefix;
- MotherDuck organization and current DuckDive service-account conventions.

The only new analytical storage boundary is the `wa_vehicle_market` managed DuckLake/database and its restricted share inside the existing MotherDuck organization. The temporary lens reuses the existing `vic_house_lab` read identity. Do not create a second Vercel project, Neon project, Blob store, MotherDuck organization, auth estate, service account, or human seat.

The VIC production rollback reference is commit `e10181b623e299f7dc550eeafe0dfd3c727cdc10`. Git rollback does not alter Neon rows, Blob objects, MotherDuck data, or Dives. The retention record defines the current preservation boundary.

## Implementation map

- Source, schema, manifest, observation, and quality contracts: `src/lib/vehicle-market/contracts.ts`
- Direct HTTP adapter and strict filter grammar: `src/lib/vehicle-market/autotrader-adapter.ts`
- Immutable local and private Blob evidence stores: `src/lib/vehicle-market/raw-object-store.ts`
- Private Blob fixture seeding: `src/lib/vehicle-market/blob-seed.ts`
- Shared persist-before-parse replay/reconciliation path: `src/lib/vehicle-market/pipeline.ts`
- Snapshot and population comparability policy: `src/lib/vehicle-market/quality-policy.ts`
- Gated sequential acquisition and retry policy: `src/lib/vehicle-market/live-acquisition.ts`
- Deterministic dimensional staging and event rules: `src/lib/vehicle-market/analytical-model.ts`
- Executable DuckLake staging/publication: `src/lib/vehicle-market/motherduck-publisher.ts`
- Neon operational persistence adapter: `src/lib/vehicle-market/operational-store.ts`
- Operator CLI: `scripts/vehicle-market.ts`
- Sanitized evidence and dated probes: `fixtures/vehicle-market/`
- Additive Neon migration: `db/019_vehicle_market_ingestion.sql`
- Managed DuckLake DDL and governed views: `db/ducklake/wa_vehicle_market.sql`
- Transactional staged promotion: `db/ducklake/load_vehicle_market_run.sql`
- WA dataset authority: `src/lib/dataset-definitions/wa-vehicle-market.ts`
- Starter Dives: `src/dives/vehicle-market-atlas.tsx`, `src/dives/market-movement.tsx`, `src/dives/vehicle-lens.tsx`, and `src/dives/data-observatory.tsx`
- Retention authority and historical disposal procedure: `docs/WA_VEHICLE_MARKET_RETENTION.md`

## Commands

Fixture replay, with no source or cloud access:

```powershell
corepack pnpm vehicle:replay -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
```

Seed the same exact fixture bytes to the existing private Blob store. This uploads evidence but does not contact the source or parse through a second path:

```powershell
corepack pnpm vehicle:seed-blob -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
```

Replay the emitted private manifest without source access:

```powershell
corepack pnpm vehicle:replay -- --manifest 'https://<existing-private-store>/<manifest>.json'
```

Initialize the managed DuckLake and governed schemas after explicit MotherDuck DDL approval:

```powershell
corepack pnpm vehicle:ducklake:init -- --execute
```

Bounded live technical smoke to local evidence only:

```powershell
$env:VEHICLE_MARKET_SOURCE_ENABLED='true'
corepack pnpm vehicle:smoke -- --live --scope fixtures/vehicle-market/scopes/wa-subaru-bounded.json
```

For the approved shared-estate smoke, add `--blob --record-neon` after migration 019 and private Blob replay are proven.

Full authorised WA Used collection:

```powershell
$env:VEHICLE_MARKET_SOURCE_ENABLED='true'
$env:VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION='true'
corepack pnpm vehicle:collect -- --live --full-wa-used
```

Publish a saved snapshot-comparable run to DuckLake and record publication reconciliation in Neon:

```powershell
corepack pnpm vehicle:publish -- --run <run-id> --execute --record-neon
```

The full command requires private Blob and Neon access. The publish command re-reads immutable raw pages, verifies their hashes and page identities, builds deterministic dimensional rows, stages them under the run UUID, promotes them transactionally, and reconciles fact counts.

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

For the temporary MVP current-market lens, a run is snapshot-comparable when every expected page is present, scope violations are zero, raw hits reconcile to canonical unique IDs plus explicitly recorded duplicate hits, and either:

- the run is `COMPLETE` or `CHANGED_DURING_CAPTURE` with zero duplicate hits; or
- the run retains its recorded `INVALID` status solely for duplicate-induced source-order drift, with at most 10 duplicate hits and a duplicate rate no greater than 0.1%.

Repeated listing IDs resolve deterministically to the newest source update, then the lexicographically greatest source-record hash. Status, start/end totals, raw hits, unique IDs, and duplicates remain visible; a bounded-drift observation is not relabelled `COMPLETE`.

Adjacent snapshot-comparable observations support inventory points and attribute changes only for listing IDs present in both observations. `NEWLY_OBSERVED` and `NO_LONGER_OBSERVED` require both runs to pass the stricter population-comparable rule. Source absence never establishes a sale.

## Published repeat-observation evidence

The existing DuckLake contains two private WA Used observations:

- `6dd6bdba-48e5-4092-8892-69eabe00c317`, observed 2026-08-11: 14,747 canonical facts, `CHANGED_DURING_CAPTURE`;
- `a3731a93-339f-469e-8ca5-c1be310a8b85`, observed 2026-08-17: 14,737 canonical facts from 14,741 raw hits with four duplicates, recorded `INVALID`.

Both are snapshot-comparable and neither is population-comparable. The governed intersection contains 12,984 repeated listing IDs. It exposes 2,801 asking-price changes, 137 odometer changes, 391 content changes, nine seller changes, and 40 specification changes. Population set-difference counts are `NULL`, and the set-difference event row count is zero.

## Release gates

Before applying shared-infrastructure mutations, verify the exact existing resource identity and obtain explicit approval for the named operation. Apply migration 019 additively; use the dedicated Blob prefix; create only `wa_vehicle_market` in MotherDuck; keep existing owner/workspace authority fail-closed.

The approved source use is bounded to private fixture replay, a bounded live smoke, and one private full snapshot for this experiment. The two live-source gates remain false in Vercel and are enabled only in the operator process invoking the approved command.

Public sharing and custom-domain changes are not part of this release. Market Movement uses only the governed snapshot intersection and visibly withholds population set differences for the current run pair.
