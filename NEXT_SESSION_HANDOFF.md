# Next session handoff

Updated: 2026-08-12 (Australia/Perth)

## Outcome achieved

The temporary WA Used Vehicle Listings MVP is live for an approved existing DuckDive owner on the existing estate.

- A governed current observation of 14,747 listings is published in MotherDuck.
- Immutable raw evidence is retained in the existing private Vercel Blob store.
- Neon contains reconciled operational lineage.
- The existing Vercel project is configured for the WA runtime with both source-acquisition gates disabled.
- Market Atlas, Vehicle Lens, and Data Observatory are provisioned and query successfully in MotherDuck.
- The same three reports now render successfully inside authenticated DuckDive embeds.

Do not rerun acquisition or rebuild the data plane. The remaining work is limited release assurance, evidence capture, and mandatory disposal by 2026-08-18 Australia/Perth.

## Start here

- Read `.agents/skills/vic-house-platform-operator/SKILL.md` before Vercel, Neon, Blob, MotherDuck, credentials, Dives, deployment, or cleanup work.
- Treat `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` as source/data authority, subject to the accepted bounded-drift correction below.
- Reverify current external state before mutation.
- Never write credentials or the restricted MotherDuck share URL to Git, logs, screenshots, or chat.
- Do not create another Vercel project/team, Neon project, Blob store, MotherDuck organization, auth estate, service account, or human seat.

## Git and deployment state

- Current `origin/main`: `f583fcc` (`Patched Motherduck API to support new provisioning endpoints and added tests for the embed route and Motherduck API.`).
- Relevant preceding commits:
  - `260902e` — refresh registered source Dives even when owner mappings already exist;
  - `04c10cc` — correct current-observation copy and publishable-run policy wording;
  - `0dc62e9` — merge the expanded WA handoff;
  - `3cd6d33` — merge the WA vehicle-market implementation.
- The user confirmed the Vercel rebuild after `f583fcc` succeeded.
- Production project/domain remain the existing `vic-house-data-lab` / `https://duckdive.gold` estate.
- Former VIC-only rollback reference: `e10181b623e299f7dc550eeafe0dfd3c727cdc10`.
- At handoff update, the local worktree was clean on `main` at `f583fcc`.

## Accepted observation and MVP correction

The full acquisition enumerated every expected page, but the source total increased by one listing during the 22.42-minute capture. The user explicitly accepted this as the MVP current snapshot.

- Run ID: `6dd6bdba-48e5-4092-8892-69eabe00c317`
- Stored observation date: `2026-08-11`
- Scope: `state=wa`, `condition=Used`, `sortBy=listing_created`, `orderBy=asc`, `paginate=50`
- Status: `CHANGED_DURING_CAPTURE`
- Pages expected/fetched: `295 / 295`
- Source total start/end: `14,746 / 14,747`
- Raw hits / unique listing IDs: `14,747 / 14,747`
- Duplicate hits: `0`
- Scope violations: `0`
- Page 295 rows: `47`
- Source total changed between capture pages 193 and 194.

Policy:

- Fully enumerated bounded-drift runs may serve current inventory, listing-age, cohort, and quality views when pages reconcile, raw hits are unique, and duplicate/scope-violation counts are zero.
- Periodic movement, newly observed, disappearance, and reappearance comparisons remain adjacent-`COMPLETE`-run only.
- Never relabel this run `COMPLETE` or conceal its start/end totals.
- Never infer sale.
- Do not use the older fixture total of 14,749 as a production constant.

## Verified platform state

### Vercel runtime

The user confirmed the existing Vercel project has the WA selectors configured and redeployed:

```env
WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE=wa_vehicle_market
WA_VEHICLE_MARKET_SHARE_URL=<restricted wa_vehicle_market_app share URL>
WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME=vic_house_lab
VEHICLE_MARKET_SOURCE_ENABLED=false
VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION=false
```

Do not expose the share URL. Keep both source gates `false`.

### Private Blob

- Exact prefix: `vehicle-market/source=autotrader/market=wa-used/`
- The full run contains pages through `page=000295`, the page-one probe, and a content-addressed manifest.
- Every source response was persisted before parsing.
- Do not run another full replay merely for release assurance.

### Neon

- Migration `019_vehicle_market_ingestion.sql` is applied.
- Ingestion runs: 2 (`COMPLETE`: bounded smoke; `CHANGED_DURING_CAPTURE`: full run).
- Requests/raw-object metadata: `299 / 299`.
- Recorded response bytes: `99,033,561`.
- Publication results: `1`, status `reconciled`.
- Publication fingerprint: `8a0c90ba2b83aed61c842516c99413eec7f333048f92c2c9757a8bf1249d85f7`.
- Do not manually edit immutable raw-object rows.

### MotherDuck / managed DuckLake

- Database: `wa_vehicle_market`
- Restricted share: `wa_vehicle_market_app`
- Share posture: `RESTRICTED`, `DISCOVERABLE`, `AUTOMATIC`
- `explorer` has read access.
- `core.fact_listing_observation`: `14,747`
- `core.dim_listing`: `14,747`
- `core.dim_vehicle_spec`: `8,869`
- `core.dim_seller_version`: `216`
- `core.dim_location`: `121`
- `core.dim_listing_content`: `13,956`
- `contract.vehicle_market_current`: `14,747`
- `contract.listing_events`: `0`, correctly, because no comparable adjacent `COMPLETE` observation exists.
- Neon publication source/fact reconciliation: `14,747 / 14,747`.

### Dives and DuckDive

The approved existing owner has three owner-scoped WA Dives and three registered source Dives:

```text
vehicle-market-atlas  / Market Atlas
vehicle-lens          / Vehicle Lens
data-observatory      / Data Observatory
```

Existing VIC mappings were preserved.

Verified in MotherDuck:

- Market Atlas shows 14,747 listings, 14,747 priced rows, median asking price, odometer distributions, and the asking-price-not-transaction-price disclaimer.
- Vehicle Lens shows real make/model rows, vehicle age, odometer/km-per-year, cohort sizes, cohort ranges, and percentiles.
- Data Observatory shows `CHANGED_DURING_CAPTURE`, `295 / 295`, 14,747 raw hits, 14,747 unique IDs, zero duplicates, and zero violations.

Verified in DuckDive after `f583fcc`:

- Authenticated embeds render successfully against the governed WA share.
- The fix passes the configured share explicitly in the MotherDuck embed-session `required_resources` field, bound to alias `wa_vehicle_market`.
- This explicit session binding is required; the same Dives worked in MotherDuck before they worked in DuckDive.

## Why the embed fix matters

`REQUIRED_DATABASES` in the Dive source alone was insufficient in the DuckDive embed path. Embedded sessions created only with `username` resolved a database without the expected `contract` schema and returned `schema "contract" does not exist`.

Commit `f583fcc` updates both authenticated embed entry points:

- gallery provisioning/preview in `src/lib/dive-provisioning.ts`;
- owned Dive embed route in `src/app/api/dives/[diveId]/embed/route.ts`.

`src/lib/motherduck-api.ts` now supports per-session `required_resources`. Preserve this behavior in future refactors. Do not treat MotherDuck UI success as proof that DuckDive embedding works.

## Validation evidence

Codespaces validation on merged `main` before the final embed fix:

```text
pnpm install --frozen-lockfile  passed
pnpm test                       49 files / 176 tests passed
pnpm lint                       0 errors / 17 existing warnings under .agents/skills/vercel-optimize
pnpm typecheck                  passed
pnpm build                      passed
```

Focused source-Dive refresh validation: 8/8 provisioning tests passed.

Focused explicit embed-resource validation:

```text
5 files / 14 tests passed
focused ESLint passed
git diff --check passed
```

The user confirmed the deployed DuckDive embed worked after `f583fcc`.

## Remaining work

### 1. Optional final owner edit/reset smoke

If continuing release assurance, use one owner Dive only:

- make a harmless report edit;
- verify a new version is recorded;
- reset to the registered starter;
- verify the governed values still load in DuckDive.

Do not edit all three merely to prove the path.

### 2. Denial checks

Verify only if the user wants to continue release assurance:

- signed-out workspace access redirects to login;
- an unknown/unallowlisted user is denied;
- one owner cannot access another owner’s Dive;
- arbitrary Dive IDs and mismatched dataset/resource combinations fail closed;
- public sharing remains unavailable for WA;
- application/source acquisition remains impossible because both source gates are false.

### 3. Release evidence

Record, without secrets:

- deployed commit (`f583fcc`) and production URL;
- Vercel Ready/build result;
- authenticated DuckDive report results;
- optional edit/reset result;
- optional denial results;
- known limitation: only one accepted observation, so no movement or lifecycle claims.

Do not claim broader production completion from a Vercel build alone.

### 4. Mandatory retention cleanup

All WA vehicle-market raw responses, Neon operational rows, DuckLake data/share, and temporary Dives must be removed no later than **2026-08-18 Australia/Perth**.

- Follow `docs/WA_VEHICLE_MARKET_RETENTION.md` exactly.
- Cleanup is destructive and requires explicit user approval plus exact-target verification.
- Delete only the WA database/share, WA Dive mappings/Dives, WA Neon rows, and exact Blob prefix.
- Never target the Blob root or remove shared VIC/Auth/Neon/Vercel/MotherDuck resources.

## Hard boundaries

- No second estate, project, team, seat, organization, Blob store, Neon project, auth estate, or service account.
- No repeated full collection, automatic collection, make/year partition run, scheduler, or national rollout.
- No photo download, VIN resolution, or detail-page scraper.
- No physical feature bridge without a governed analytical requirement.
- Descriptions and feature strings remain outside the observation fact.
- Source `pricingHistory` remains supplementary only.
- No first-observation movement, disappearance, reappearance, or sale claims.
- Public WA sharing remains disabled.
- Never expose credentials or the restricted share URL.
