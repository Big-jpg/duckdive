# Next session handoff

Updated: 2026-08-15 (Australia/Perth)

## Outcome achieved

The temporary WA Used Vehicle Listings MVP is live for an approved existing DuckDive owner on the existing estate.

- A governed current observation of 14,747 listings is published in MotherDuck.
- Immutable raw evidence is retained in the existing private Vercel Blob store.
- Neon contains reconciled operational lineage.
- The existing Vercel project is configured for the WA runtime with both source-acquisition gates disabled.
- Market Atlas, Vehicle Lens, and Data Observatory are provisioned and query successfully in MotherDuck.
- The same three reports now render successfully inside authenticated DuckDive embeds.
- The owner edit/save path is now proven in production: Vehicle Lens was changed from `Vehicle Lens` to `Vehicle Lens — WA` and persisted as version 2 without changing analytical semantics.
- The saved version exposes its requested-vs-applied manifest, validation results, report purpose, and reversible version history in DuckDive.
- Production email magic-link authentication is restored and proven through an allowlisted end-to-end smoke, including session exchange and redirect to `/workspace`; the denied path remained generic and email-free.

Do not rerun acquisition or rebuild the data plane. The next product phase is base-site UI/UX polish only. Mandatory WA disposal remains due by 2026-08-18 Australia/Perth.

## Start here

- Read `.agents/skills/vic-house-platform-operator/SKILL.md` before Vercel, Neon, Blob, MotherDuck, credentials, Dives, deployment, or cleanup work.
- Treat `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` as source/data authority, subject to the accepted bounded-drift correction below.
- Reverify current external state before mutation.
- Never write credentials or the restricted MotherDuck share URL to Git, logs, screenshots, or chat.
- Do not create another Vercel project/team, Neon project, Blob store, MotherDuck organization, auth estate, service account, or human seat.
- For the next phase, treat the embedded Dive as an opaque governed surface. Improve the application around it; do not modify report source, report validation, data contracts, APIs, auth, ownership, or infrastructure.

## Git and deployment state

- Current `origin/main`: `69392a8` (`Upgrade Neon Auth beta dependencies`).
- Relevant preceding commits:
  - `2954593` — add the guarded production magic-link smoke and exact QA cleanup;
  - `65cab01` — add administrator control for AI Gateway model selection;
  - `4de18eb` — default completed sign-ins to `/workspace`;
  - `1cf0f6a` — add the report-validation feature flag used to isolate the rejected-plan failure;
  - `cc8bdc8` — update the prior session handoff;
  - `f583fcc` — bind the governed MotherDuck share explicitly when creating embed sessions;
  - `260902e` — refresh registered source Dives even when owner mappings already exist;
  - `04c10cc` — correct current-observation copy and publishable-run policy wording;
  - `0dc62e9` — merge the expanded WA handoff;
  - `3cd6d33` — merge the WA vehicle-market implementation.
- Production deployment `dpl_6kTFVgjVqjDPKdyQ7etJyUfJTTbd` served the successful edit/save request after the connection and validation fixes.
- Production deployment `dpl_CKVfUZ7C87P4nntNRSt4qzTL8fnG` deployed `69392a8` to the existing estate at 2026-08-15 21:36:51 Australia/Perth; Vercel reported `Ready` and aliased it to `https://duckdive.gold`.
- Production project/domain remain the existing `vic-house-data-lab` / `https://duckdive.gold` estate.
- Former VIC-only rollback reference: `e10181b623e299f7dc550eeafe0dfd3c727cdc10`.
- Before this documentation update, the local worktree was clean on `main` at `69392a8` and matched `origin/main`.

## Production magic-link incident resolved

The email link itself, allowlist, nested callback encoding, and Neon verifier were not the failed boundaries. Neon accepted the emailed token and redirected to DuckDive, but the magic-link request response no longer issued the session challenge cookie required by the verifier exchange. This was reproduced both through DuckDive and directly against the Neon Auth endpoint.

Commit `69392a8` provides a migration-safe repair:

- upgrades `@neondatabase/auth` from `0.4.2-beta` to `0.5.0-beta`;
- generates a cryptographically random 256-bit challenge inside the allowlisted DuckDive request route;
- sends the same challenge to Neon and returns it to the browser as secure, HTTP-only, SameSite=Lax cookies;
- temporarily issues both canonical `session_challenge` and legacy `session_challange` cookie names with the identical value so the current Neon migration and rollback boundary both work;
- prefers a challenge returned by Neon if the upstream service resumes issuing one;
- issues no challenge for denied, rate-limited, or failed upstream requests;
- retains generic allowlist denial and exact QA cleanup in `pnpm smoke:magic-link`.

Production smoke on 2026-08-15:

```text
allowlisted request       202; canonical and legacy challenge cookies present
denied request            202; no cookies
Neon verification         302 to https://duckdive.gold/auth/complete
application callback      307; session_token and local.session_data present
authenticated completion  307 to https://duckdive.gold/workspace
denied delivery            0 messages
cleanup                    allowlist row removed, one Neon Auth QA user removed, two temporary mailboxes removed
```

An independent post-smoke database check returned `appQaRows: 0` and `neonAuthQaRows: 0`. No QA identity remains. Before deployment, the candidate passed 57 test files / 199 tests, lint with zero errors and 17 pre-existing warnings, typecheck, production build, and `git diff --check`. Local preflight remained red only for absent WA vehicle-market/MotherDuck environment variables, not auth.

Bounded Vercel logs for the smoke window independently recorded the final `/auth/complete` request with `sessionTokenPresent: true`, `sessionDataPresent: true`, and `sessionResolved: true`. `challengePresent: false` at that page is expected because middleware had already exchanged the one-time challenge. No auth error was present in the inspected production window.

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

Verified in DuckDive after `6c85c4c`:

- Authenticated embeds render successfully against the governed WA share.
- The fix passes the configured share explicitly in the MotherDuck embed-session `required_resources` field, bound to alias `wa_vehicle_market`.
- This explicit session binding is required; the same Dives worked in MotherDuck before they worked in DuckDive.

### Verified edit/save smoke

The owner completed the smallest useful production mutation on Vehicle Lens:

- requested change: replace the unique H1 `Vehicle Lens` with `Vehicle Lens — WA`;
- result: version 1 advanced to version 2;
- applied change: one heading text node only;
- unchanged: queries, metrics, filters, charts, styling, governed contract, and ownership protections;
- saved metadata: exact/unique-copy validation passed, analytical semantics were recorded as unchanged, and the report purpose was reconciled to the revised geographic title;
- completed run: `15731c6b-61d6-4e78-9c55-8d631c97bbbb`;
- Vercel request ID: `jgzq6-1786550773430-ac70832e35fc`.

Independent Vercel inspection found one MotherDuck token request during the successful `/api/chat` invocation, followed by completed MCP edit and embed verification calls. The post-save `/report`, `/version`, and `/embed` requests returned `200` repeatedly. No post-save `CONNECTION_ENDED` error was present in the inspected production window.

The user supplied authenticated visual evidence of the version-2 report, saved manifest, reconciled report purpose, and updated embedded heading. A later independent browser refresh redirected to login because that browser session had expired, so do not misstate that signed-in re-read as independently repeated.

## Why the embed fix matters

`REQUIRED_DATABASES` in the Dive source alone was insufficient in the DuckDive embed path. Embedded sessions created only with `username` resolved a database without the expected `contract` schema and returned `schema "contract" does not exist`.

Commit `f583fcc` updates both authenticated embed entry points:

- gallery provisioning/preview in `src/lib/dive-provisioning.ts`;
- owned Dive embed route in `src/app/api/dives/[diveId]/embed/route.ts`.

`src/lib/motherduck-api.ts` now supports per-session `required_resources`. Preserve this behavior in future refactors. Do not treat MotherDuck UI success as proof that DuckDive embedding works.

## Why the edit/save fix matters

Commit `6c85c4c` addressed the two production failure modes observed during report editing:

- MotherDuck connection/token work is single-flight so concurrent report metadata and embed requests do not race redundant token creation;
- report update plans are schema-validated before mutation, while the temporary validation flag remains available for controlled diagnosis.

The successful version-2 smoke proves the full owner-visible path: interpret request, validate the proposed change, mutate the governed Dive, persist version metadata, and reload the updated embed. Do not remove these protections as part of visual work.

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

After `6c85c4c`, the focused and full local checks passed before deployment, including 53 test files / 185 tests, typecheck, focused lint, build, and `git diff --check`. The production edit/save evidence above is the release-level proof for this path.

## Next phase: base-site UI/UX polish

### Intended outcome

Make the signed-in journey from workspace to report to DuckDive editor clearer, calmer, more legible, and easier to use on desktop and mobile. This is presentation work around a now-proven Dive workflow, not another infrastructure phase.

### Smallest owner-visible slice

Start with the two active application surfaces:

1. `src/components/LabHome.tsx`: improve workspace hierarchy, report discovery, action clarity, and the distinction between included reports and optional data-source paths.
2. `src/components/EditLab.tsx`: improve the report/editor hierarchy, pane navigation, toolbar status/actions, readable metadata and explanations, responsive behavior, keyboard focus, and loading/error states.

Keep `src/components/AppBrand.tsx`, `src/app/design-tokens.css`, and `src/app/lab.css` as the active shell seams. Confirm whether `src/app/styles.css` is unused before consolidating or removing it; do not create a third visual system.

### Hard scope boundary for this phase

In scope:

- visual hierarchy, typography, spacing, colour application, responsive layout, and interaction affordances;
- accessible focus/hover/disabled states and clearer status/error/loading presentation;
- workspace, login, header/navigation, and editor-shell consistency where needed for the owner journey;
- copy changes that improve comprehension without changing analytical meaning.

Out of scope:

- embedded Dive TSX, starter-report source, report validation, mutation semantics, or versioning;
- MotherDuck/DuckLake databases, shares, tokens, service accounts, MCP calls, or embed-session contracts;
- Neon schemas or metadata, Vercel configuration, Blob, ingestion, acquisition, dataset registry, or analytics contracts;
- authentication, allowlisting, ownership checks, public-sharing policy, API payloads, or route behavior;
- any new data source, report, query, metric, chart, or external resource.

### Validation for the UI slice

- inspect the signed-in workspace and editor at desktop and narrow mobile widths;
- traverse workspace → report → DuckDive using keyboard as well as pointer input;
- verify visible focus, readable contrast, loading/error/disabled states, and no clipped primary actions;
- verify the existing iframe still loads and `/report`, `/version`, and `/embed` behavior remains unchanged;
- do not increment a report version merely to test visual changes;
- run focused lint/typecheck while iterating, then the normal test/build/diff checks before release;
- record authenticated owner visual evidence separately from Vercel Ready/build evidence.

Optional denial checks remain useful release assurance, but they are not part of the UI redesign and must not expand its scope.

## Mandatory retention cleanup

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
- During the UI/UX phase, do not change the embedded Dive renderer, report source, validation path, MotherDuck/Neon/data plane, auth, ownership, or API contracts.
