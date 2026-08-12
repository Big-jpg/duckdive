# Next session handoff

Updated: 2026-08-12 (Australia/Perth)

## Outcome already achieved

The WA Used Vehicle Listings MVP data plane is built and populated on the existing DuckDive estate. A governed current-market snapshot of 14,747 listings is available in MotherDuck, backed by immutable private Blob evidence and reconciled Neon operational lineage.

The next owner-visible outcome is not data acquisition. It is to configure the merged application runtime, provision the three WA starter Dives for an approved owner, and smoke the real reports against the published views.

## Start here

- Read `.agents/skills/vic-house-platform-operator/SKILL.md` before credentials, Vercel, Neon, Blob, MotherDuck, Dives, deployment, or cleanup work.
- Treat `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` as source/data authority, with the explicit MVP correction below.
- Do not create another Vercel project/team, Neon project, Blob store, MotherDuck organization, auth estate, service account, or human seat.
- Do not rerun the full source collection. The accepted snapshot is already published.
- Reverify external state before mutation. Never place tokens or the restricted MotherDuck share URL in Git or chat.

## Git state

- GitHub `origin/main`: `3cd6d33ee7140e8933b81b05fe3388bd29f33302` (`Merge pull request #1 from Big-jpg/codex/wa-vehicle-market`).
- Feature commit included by that merge: `386cf01e690773e6720ef2ea980134ccaf8eab5f` (`Allow bounded-drift vehicle market runs in current views`).
- At handoff creation, the local checkout was clean on `codex/wa-vehicle-market` at `386cf01`; local `main` was still at the former VIC commit.
- A new agent should start from the merged ref, for example:

```powershell
git fetch origin --prune
git switch -c codex/wa-vehicle-market-release origin/main
```

- Former VIC production rollback reference: `e10181b623e299f7dc550eeafe0dfd3c727cdc10`.

## Explicit MVP contract correction

The first full acquisition was fully enumerated but the source total increased by one listing during the 22.42-minute run. The user explicitly directed that this must not discard an otherwise high-quality MVP dataset.

Therefore:

- operational status remains truthfully `CHANGED_DURING_CAPTURE`;
- fully enumerated changed runs may serve current-market views when all expected pages are present, raw hits are unique, and duplicate and scope-violation counts are zero;
- the accepted run is available to current inventory, listing-age, cohort, and quality analysis;
- periodic movement, newly observed, disappearance, and reappearance comparisons remain `COMPLETE`-only;
- sale inference remains forbidden;
- do not relabel the Neon run as `COMPLETE` or conceal its start/end totals.

## Accepted observation

- Run ID: `6dd6bdba-48e5-4092-8892-69eabe00c317`
- Stored observation date: `2026-08-11` (the operator currently derives this from UTC; do not rename immutable evidence)
- Scope: `state=wa`, `condition=Used`, `sortBy=listing_created`, `orderBy=asc`, `paginate=50`
- Pages expected/fetched: `295 / 295`
- Source total start/end: `14,746 / 14,747`
- Raw hits: `14,747`
- Unique listing IDs: `14,747`
- Duplicate hits: `0`
- Scope violations: `0`
- Page 295 returned: `47`
- Source total changed between capture pages 193 and 194.
- End page-one probe returned total `14,747`.

Do not use the older dated fixture total of 14,749 as a production constant.

## Verified external state

Verified read-only on 2026-08-12 Australia/Perth.

### Private Vercel Blob

- Existing store and project are reused.
- Exact prefix: `vehicle-market/source=autotrader/market=wa-used/`
- Full run contains page folders through `page=000295` plus `probe=page-000001` and a content-addressed manifest.
- Every response was persisted before parsing.
- A failed/changed run remains replayable; a separate full Blob replay is slow and is not required for the next product step.

### Neon operational control plane

- Migration `019_vehicle_market_ingestion.sql` is applied.
- Ingestion runs: 2 total (`COMPLETE`: 1 bounded smoke, `CHANGED_DURING_CAPTURE`: 1 full run).
- Ingestion requests: `299`.
- Immutable raw-object metadata rows: `299`.
- Recorded response bytes: `99,033,561`.
- Publication results: `1`, status `reconciled`.
- Full-run publication fingerprint: `8a0c90ba2b83aed61c842516c99413eec7f333048f92c2c9757a8bf1249d85f7`.
- Do not manually edit immutable raw-object rows.

### MotherDuck / managed DuckLake

- Database: `wa_vehicle_market`.
- Restricted share: `wa_vehicle_market_app`.
- Share posture: `RESTRICTED`, `DISCOVERABLE`, `AUTOMATIC`.
- `explorer` role has read access.
- Observation runs: `1`.
- `core.fact_listing_observation`: `14,747`.
- `core.dim_listing`: `14,747`.
- `core.dim_vehicle_spec`: `8,869`.
- `core.dim_seller_version`: `216`.
- `core.dim_location`: `121`.
- `core.dim_listing_content`: `13,956`.
- `contract.vehicle_market_current`: `14,747` rows.
- `contract.listing_events`: `0` rows, correctly, because no comparable `COMPLETE` adjacent observation exists.
- Neon publication source/fact reconciliation: `14,747 / 14,747`.

### Existing workspaces and Dives

- No WA `app.workspace_dive` mappings exist yet.
- No WA source-Dive setting IDs exist yet.
- Existing VIC mappings are preserved: four workspaces each retain `market-pulse`, `market-matchup`, and `suburb-story` mappings.
- Existing settings contain only the three VIC `source_dive:*` keys.
- Do not delete VIC mappings merely to provision WA starters.

## Implemented code

- WA is the only active default dataset in `src/lib/datasets.ts`.
- Dataset contract: `src/lib/dataset-definitions/wa-vehicle-market.ts`.
- Starter sources:
  - `src/dives/vehicle-market-atlas.tsx`
  - `src/dives/vehicle-lens.tsx`
  - `src/dives/data-observatory.tsx`
- Source adapter and strict query/filter grammar: `src/lib/vehicle-market/autotrader-adapter.ts`.
- Live operator acquisition uses the real curl transport because Node fetch received HTTP 403 while direct curl returned HTTP 200. It still converges on the same immutable store and shared parser/reconciliation pipeline.
- Private Blob capture/replay: `src/lib/vehicle-market/raw-object-store.ts`, `blob-seed.ts`, and `pipeline.ts`.
- Operational persistence: `src/lib/vehicle-market/operational-store.ts`.
- Deterministic model and claims: `src/lib/vehicle-market/analytical-model.ts`.
- DuckLake DDL/views: `db/ducklake/wa_vehicle_market.sql`.
- Publication: `src/lib/vehicle-market/motherduck-publisher.ts` and `db/ducklake/load_vehicle_market_run.sql`.
- Publication uses a single MotherDuck PostgreSQL connection (`max: 1`) because the explicit transactional promotion script is unsafe on a larger client pool.
- Public sharing is disabled in the WA dataset contract.
- Retention/disposal authority: `docs/WA_VEHICLE_MARKET_RETENTION.md`.

## Validation completed

Verified after the merge content was fetched:

```text
corepack pnpm test       49 files / 176 tests passed
corepack pnpm lint       0 errors / 17 existing warnings under .agents/skills/vercel-optimize
corepack pnpm typecheck  passed
corepack pnpm build      passed
git diff --check         passed
```

The public root `https://duckdive.gold/` returned HTTP 200, but its generic unauthenticated content did not prove which dataset deployment is active. No authenticated post-merge production smoke has been completed.

## Remaining work, in order

### 1. Configure the WA runtime selectors

Current local preflight fails only because these values are absent:

```env
WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE=wa_vehicle_market
WA_VEHICLE_MARKET_SHARE_URL=<restricted md:_share URL from LIST SHARES or MotherDuck UI>
WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME=vic_house_lab
VEHICLE_MARKET_SOURCE_ENABLED=false
VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION=false
```

Configure the required deployment environments in the existing Vercel project `vic-house-data-lab`. Keep both source gates `false`. Do not store the share URL in Git. Re-run:

```powershell
corepack pnpm preflight
```

Expected: no WA runtime errors.

### 2. Verify or create the post-merge deployment

- Reverify the Vercel deployment commit against `origin/main` merge commit `3cd6d33`.
- Do not assume Git merge means production is correct.
- If an explicit production deployment is required, obtain the normal production authorization first.
- Preserve the ability to roll back to `e10181b`; do not delete VIC resources.

### 3. Provision the three WA Dives for an approved owner

With runtime selectors configured, authenticated owner access should create/reuse the WA source Dives and create missing owner-scoped mappings through the existing provisioning path.

Required starter keys:

```text
vehicle-market-atlas
vehicle-lens
data-observatory
```

After owner access, verify:

- exactly three WA mappings for that workspace;
- source and owned Dive IDs are non-empty and distinct where expected;
- workspace MotherDuck username is still the approved existing identity;
- VIC mappings remain untouched;
- `corepack pnpm db:reconcile:workspace-dives` is interpreted carefully because historical VIC mappings are intentionally retained.

### 4. Perform authenticated owner smoke against real values

Verify:

- Market Atlas loads from `contract.vehicle_market_current` and shows 14,747 listings;
- Vehicle Lens shows real age/km/cohort values and visible insufficient-sample states;
- Data Observatory shows `CHANGED_DURING_CAPTURE`, `295 / 295`, `14,747` raw/unique rows, zero duplicates, and zero violations;
- no report claims sale or source-wide market coverage;
- asking price is clearly not transaction price;
- one report edit creates a version and reset restores the registered starter;
- report values come from governed views, not fabricated aggregates.

Copy cleanup still remains: replace phrases such as “Current complete observation” or “latest complete observation” in WA starter/product copy with “current observation” or equivalent, because this accepted MVP snapshot is fully enumerated but operationally `CHANGED_DURING_CAPTURE`.

### 5. Perform denial checks

- signed-out workspace access redirects to login;
- unknown/unallowlisted owner is denied;
- one owner cannot access another owner's Dive;
- arbitrary Dive IDs and wrong dataset/resource combinations fail closed;
- source collection remains impossible in application/deployment environments because both gates are false;
- public sharing remains unavailable.

### 6. Release evidence

Record separately:

- deployed commit and URL;
- preflight result;
- authenticated owner screenshots/results;
- edit/reset result;
- denial results;
- remaining limitations.

Do not claim the release complete merely because Vercel reports `Ready`.

### 7. Retention deadline

All WA vehicle-market raw responses, operational rows, DuckLake data/share, and temporary Dives must be removed no later than 2026-08-18 Australia/Perth.

- Follow `docs/WA_VEHICLE_MARKET_RETENTION.md`.
- Cleanup is destructive and still requires explicit approval plus exact-target verification.
- Delete only the WA database/share, WA Dive mappings, WA Neon rows, and the exact Blob prefix.
- Never target the Blob store root or remove shared VIC/Auth/Neon/Vercel/MotherDuck resources.

## Hard boundaries

- No second estate, project, team, seat, organization, Blob store, Neon project, auth estate, or service account.
- No automatic or repeated full source collection.
- No make/year partition execution.
- No photo downloading, VIN resolution, detail-page scraper, scheduler, workflow engine, or national rollout.
- No physical feature bridge until a governed analytical requirement exists.
- Descriptions and feature strings remain outside the observation fact.
- Source `pricingHistory` is supplementary only.
- No first-run price movement, disappearance, reappearance, or sale claims.
- Public sharing remains disabled.
- Never expose credentials or the restricted share URL.
