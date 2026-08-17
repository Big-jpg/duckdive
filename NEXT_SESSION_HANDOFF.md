# Next session handoff

Updated: 2026-08-17 (Australia/Perth)

## Current outcome

The approved second-observation plan for the temporary WA Used Vehicle Listings MVP is complete on the existing DuckDive estate.

- Run `a3731a93-339f-469e-8ca5-c1be310a8b85` is published to the existing `wa_vehicle_market` DuckLake and recorded as reconciled in Neon.
- Its recorded status remains `INVALID`; the product does not relabel or conceal the four duplicate hits.
- The two published observations now support snapshot time-series points and matched-listing changes.
- Population set differences remain withheld because neither observation is population-comparable.
- The temporal-contract DDL is applied transactionally to the existing DuckLake.
- The existing `wa_vehicle_market_app` share remains restricted; no new MotherDuck database, share, service account, organization, or human seat was created.
- Four owner-scoped starter reports are live: Market Atlas, Market Movement, Vehicle Lens, and Data Observatory.
- The three pre-existing owner reports were reset to the registered starters with reversible version history, as explicitly approved.
- Production deployment `dpl_48QmSfK34D7nPa4TdjX1nZEim1VM` is `Ready` and aliased to `https://duckdive.gold`.

Do not run another acquisition. Mandatory WA disposal remains due by 2026-08-18 Australia/Perth unless the user explicitly changes the retention authority. Follow `docs/WA_VEHICLE_MARKET_RETENTION.md` when that authority is exercised.

## Published observation evidence

| Observation | Recorded status | Raw hits | Unique listing IDs | Duplicate hits | Scope violations | Comparison class |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 2026-08-11 / `6dd6bdba-48e5-4092-8892-69eabe00c317` | `CHANGED_DURING_CAPTURE` | 14,747 | 14,747 | 0 | 0 | `SNAPSHOT_COMPARABLE` |
| 2026-08-17 / `a3731a93-339f-469e-8ca5-c1be310a8b85` | `INVALID` | 14,741 | 14,737 | 4 | 0 | `SNAPSHOT_COMPARABLE` |

Latest publication reconciliation:

- run key: `8fc34f...`;
- source rows / fact rows: `14,737 / 14,737`;
- listing / specification / seller / location / content dimensions: `14,737 / 8,827 / 217 / 120 / 13,907`;
- raw manifest SHA-256: `38efaec32f32...`;
- MotherDuck total facts across both observations: `29,484`.

The 17 August capture's private raw evidence, local evidence, Blob manifest, and Neon operational lineage remain immutable. Run `98361f5c-ba0b-4f32-8085-41796432c39d` remains retained raw/operational evidence only and was not published.

## Comparison policy now implemented

`src/lib/vehicle-market/quality-policy.ts` is the single product gate.

- A fully enumerated, zero-scope-violation run may be snapshot-comparable when it is complete, bounded-drift, or has at most 10 duplicate hits and at most 0.1% duplicate rate under the exact known source-ordering drift error.
- Inventory points and attribute changes use deterministic unique listing IDs.
- Intersection changes compare only listing IDs present in both adjacent snapshot-comparable observations.
- `NEWLY_OBSERVED` and `NO_LONGER_OBSERVED` require both adjacent observations to be population-comparable.
- Recorded status, start/end totals, duplicate count, hashes, and limitations remain visible.
- Source absence never proves sale; asking prices are not transactions or valuations.

Current governed values:

- current listings: `14,737`;
- observation-history rows: `29,484`;
- matched intersection: `12,984`;
- change events: `3,378`;
- advertised price changed: `2,801` (`2,542` decreases, `259` increases; median change `-$999`);
- odometer / content / seller / specification changes: `137 / 391 / 9 / 40`;
- population-set events: `0`;
- newly/no-longer-observed counts: `NULL` by policy.

Observation points:

| Date | Listings | Median asking | Median odometer |
| --- | ---: | ---: | ---: |
| 2026-08-11 | 14,747 | $28,988 | 88,138 km |
| 2026-08-17 | 14,737 | $28,990 | 88,170 km |

## Governed contracts and reports

The DuckLake bootstrap now exposes comparability, temporal, and reporting views including:

- `contract.observation_run_comparability`;
- `contract.observation_pairs`;
- `contract.listing_events`;
- `contract.market_movement`;
- `contract.market_timeseries`;
- `contract.vehicle_screen`;
- `contract.observation_run_quality`.

Production owner reports and verified versions:

| Starter key | Report | Owner version | Production readback |
| --- | --- | ---: | --- |
| `vehicle-market-atlas` | Market Atlas | 17 | 14,737 listings, $28,990 median asking, 88,170 km median odometer, two observation points |
| `market-movement` | Market Movement | 1 | 12,984 matched, 2,801 price changes, explicit population-boundary withholding |
| `vehicle-lens` | Vehicle Lens — WA | 10 | governed cohort table with `Observed change` column |
| `data-observatory` | Data Observatory | 3 | 14,737 unique IDs, 4 duplicates, `INVALID`, `SNAPSHOT COMPARABLE`, policy explanation |

The reset operation produced new reversible versions for Atlas, Lens, and Observatory and recorded report-version metadata and audit events in Neon. Market Movement already matched its source and was not mutated.

WA-scoped Neon reconciliation is exact:

- one workspace;
- four relational mappings;
- four matching legacy JSON mappings;
- zero duplicate Dive IDs;
- no public share was created.

The global `pnpm db:reconcile:workspace-dives` command currently reports 12 retired VIC mappings as unknown/mismatched because its comparison assumes every historical row belongs to the current default dataset. The WA-scoped reconciliation above passes. Do not delete those retained rows without separate destructive-data authority.

## Share, access, and acquisition boundaries

Live `LIST SHARES` metadata for `wa_vehicle_market_app` on 2026-08-17 returned:

```text
source_db_name  wa_vehicle_market
access          RESTRICTED
visibility      DISCOVERABLE
update          AUTOMATIC
grant           explorer / read
```

The share URL remains secret. Do not print it or commit it.

The dataset registry keeps `publicShare: false`. `pnpm smoke:share -- create` fails before database access with `Public sharing is disabled for the active dataset`.

Vercel lists `VEHICLE_MARKET_SOURCE_ENABLED` and `VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION` as encrypted production variables. CLI environment readback deliberately returns placeholders rather than their literal values. The last collector/operator evidence recorded both as `false`, and `assertLiveAcquisitionAuthorized` fails closed unless the required gate is exactly `true`. Do not enable either gate or run another source request.

## Code, validation, and deployment

Current code commits:

- `e46e951` — add observation comparability, temporal contracts, and Market Movement;
- `125d580` — document the repeated observation and preserve the Vehicle Lens title.

Before production publication/deployment, the candidate passed:

- focused temporal/report tests: 24 passed;
- full test suite: 57 files, 198 tests passed;
- TypeScript typecheck;
- production build;
- `git diff --check`;
- lint with zero errors and 17 pre-existing warnings under `.agents/skills/vercel-optimize`.

Production release verification on 2026-08-17:

- `https://duckdive.gold` resolves to deployment `dpl_48QmSfK34D7nPa4TdjX1nZEim1VM`;
- deployment target/status: `production / Ready`;
- authenticated `/workspace` exposes all four report cards;
- all four `/edit?...&pane=report` routes load their expected versions and live MotherDuck embeds;
- a bounded two-hour production log query returned no error logs.

## Next authorized work

The second-observation plan is finished. The next mandatory activity is retention disposal by 2026-08-18 Australia/Perth, not another collection or product phase.

Before any disposal:

1. Re-read `.agents/skills/vic-house-platform-operator/SKILL.md` and `docs/WA_VEHICLE_MARKET_RETENTION.md`.
2. Reverify exact targets and current user authority.
3. Keep the operation scoped to the temporary WA vehicle-market estate.
4. Preserve the restricted share URL and credentials.
5. Report Blob, Neon, MotherDuck, Dive, and local-evidence cleanup separately with evidence.

Production deployment, credential changes, new resources, new source calls, and destructive cleanup still require explicit authorization. The existing approval covered publication, the temporal DDL, report provisioning/reset, and this release only.
