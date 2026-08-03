# Next Session Handoff

Last verified: 2026-08-03 (Australia/Perth)

## Phase 2B BYOD semantic-evidence production release

This section is authoritative for the released Bring Your Own Semantic Model evidence flow. It supersedes the older local-only Phase 2B release notes and does not change the released Phase 2A product contract below.

### Released implementation

- Added an authenticated `/datasets/new` flow linked from the existing homepage. Semantic-model ZIPs are opened with JSZip and parsed in the browser; no raw archive, TMDL, M expression, connection identifier or RLS filter is sent to the server.
- The archive gate accepts exactly one Azure DevOps `*.SemanticModel` root with `.platform`, `definition.pbism`, `model.tmdl`, `relationships.tmdl` and table definitions. It enforces 50 MiB compressed, 10,000-entry and 250 MiB expanded limits plus unsafe-path rejection and SHA-256 fingerprints.
- The deterministic TMDL evidence parser aggregates partial table declarations and extracts descriptions, columns, measures/DAX, partitions, relationships and role summaries. Unsupported hierarchies, calculation groups, perspectives, cultures, functions and data-source documents become review diagnostics rather than silent authority.
- The review UI requires explicit purpose and grain, column/measure selection, relationship approval and diagnostic acknowledgement. Exact selected DAX may be saved; RLS persistence is optional summary-only.
- `ReviewedSemanticContractV1` is separate from the operational `DatasetDefinition` registry. This phase does not connect Fabric data, query MotherDuck, create a Dive, register a runtime dataset or change workspace-Dive ownership.
- Additive migration `db/015_dataset_drafts.sql` defines immutable, user-owned reviewed drafts. Collection/item APIs are authenticated, same-origin, private/no-store and owner-scoped; the server recomputes the contract fingerprint and rejects prohibited connectivity/raw-model detail. Create/delete audit events contain no contract content.

### Validation and release state

- Commit `1512075` (`Add BYOD semantic model review and draft flow`) is on `main` and `origin/main` and is deployed to Vercel production as `dpl_2DQprmEiqmKmtxhtVcgqJiWE82D7`, Ready, aliased to `https://duckdive.gold`, with Functions in `syd1`.
- The Git deployment became Ready before Neon migration 015 was applied. One authenticated `GET /api/dataset-drafts` produced PostgreSQL `42P01` (`app.dataset_draft` missing). Migration `015_dataset_drafts.sql` was then applied exactly once; later release logs contain only informational requests and no further runtime errors.
- 24 test files / 74 tests passed, including parser, archive limits, malformed text, determinism/privacy shape, fingerprint, CSRF, unauthenticated and cross-owner route behavior.
- TypeScript passed. Production build passed with `/datasets/new`, `/api/dataset-drafts` and `/api/dataset-drafts/[draftId]` dynamic.
- ESLint has zero errors; the existing 17 warnings remain confined to the checked-in `vercel-optimize` skill package.
- Preflight passed. VIC reconciliation remains 83 files / 88,422 source rows / dates 2004-09-14 through 2026-07-18. MotherDuck smoke passed at five months / 929 house facts / six bedroom groups / rolling annual medians.
- Anonymous browser QA confirmed `/datasets/new` redirects to `/login?next=/datasets/new`, private dataset-draft and stats APIs return 401, and an invalid public share slug returns 404.
- Authenticated owner QA passed with a synthetic, non-sensitive one-table TMDL ZIP: browser-local import, diagnostic acknowledgement, purpose/grain confirmation, selected columns and DAX measure, reviewed save, full-page reload, persisted review, identical idempotent resave and delete.
- The persisted QA row contained one entity, one measure, zero relationships, one acknowledged diagnostic, the expected reviewed-contract and identity keys, no security summary and no prohibited raw-model/connectivity marker. The identical resave retained the same single row and dataset-draft ID. Final database inspection returned zero QA rows, and the local synthetic fixture was removed.
- Migration 015 and the Vercel deployment were the only production mutations in this release. No credential, Fabric, MotherDuck, service-account, Dive, workspace-ownership or source-data change was made.

### Next gate

Phase 2B is released and owner-verified. Scope any operational dataset onboarding separately: this phase stores reviewed semantic evidence only and deliberately does not connect Fabric data, register a runtime dataset, provision MotherDuck resources or create a Dive. Preserve the reviewed-contract privacy boundary before adding any execution capability.

## Phase 2A question-led architecture production checkpoint

This section is authoritative over every older production, multi-dataset, DuckDive and continuation note below it.

### Reference point

- Branch: `main`.
- Current commit: `aa80102` (`Add multi-dataset editor manifest and starter landing UI`).
- `main`, `origin/main` and `origin/HEAD` were aligned with a clean working tree when this checkpoint was written.
- The user pushed Phase 2A to production and confirmed that the production release passed and the implementation behaved as intended.
- The deployment ID and release log interval were not captured in this agent session because no Vercel CLI binary was available locally. Do not invent them; inspect Vercel read-only if exact deployment telemetry is required later.
- No database migration, credential change, MotherDuck mutation or other production resource change was part of Phase 2A.

### Product and architecture contract

Phase 2A makes the existing DuckDive system question-led without introducing a parallel router, renderer, chat system or autonomous homepage mutation:

- The authenticated homepage begins with `What should the data make clear?`, offers dataset-specific example questions and requires the user to choose one trusted starter shape explicitly.
- The three current shapes remain VIC Market Pulse, Suburb Story and Market Matchup. They are trusted Dive recipes, not a general hard-coded product taxonomy.
- Choosing a shape writes only the trimmed question to a versioned `sessionStorage` draft keyed by starter. The draft expires after 24 hours, survives refresh, remains local to the browser and is cleared when submitted.
- The question opens in the existing DuckDive editor as a reviewable draft. It is never submitted automatically and consumes no AI quota until the user presses Apply.
- Live gallery previews are now secondary and lazy. The homepage does not mint three short-lived MotherDuck embed sessions until the user requests the preview gallery.
- Existing workspace ownership, chat persistence, AI admission limits, governed read-only inspection, single verified mutation, embed verification, versioning, reset, revert and public-share behavior remain unchanged.

The reusable implementation seams are:

- `src/lib/dive-provisioning.ts` remains the authoritative starter definition. It now emits safe dataset-bound homepage entries, gallery entries and editor manifests while keeping source filenames server-only.
- `src/lib/datasets.ts` separates each dataset's complete server semantic contract from its safe public contract.
- `POST /api/edit` returns a private, no-store editor manifest built from exact relational `app.workspace_dive` ownership. Missing or dataset-mismatched ownership fails closed.
- `src/components/EditLab.tsx` derives tabs, active Dive metadata and the displayed Data Contract from that server manifest. The duplicated client-side VIC starter list and direct VIC contract import are removed.
- `src/lib/duckdive-draft.ts` owns the small, versioned browser draft contract. Its tests cover trimming, starter isolation, malformed values, expiry and explicit clearing.

Do not reintroduce a separate client starter registry, infer a starter through an unreviewed classifier, place questions in URLs, or make the homepage call `/api/chat` automatically. Preserve the dataset-agnostic product boundary: VIC validates the general question -> trusted recipe -> governed DuckDive -> verified embedded result flow.

### Validation and production evidence

The implementing agent executed and recorded:

- 19 test files / 53 tests passed.
- TypeScript passed.
- Local production build passed.
- Preflight passed for VIC / `vic_house_data`.
- ESLint had zero errors; the existing 17 warnings remained confined to the checked-in `vercel-optimize` skill package.
- VIC reconciliation passed at 83 files, 88,422 observations and unchanged bounds 2004-09-14 through 2026-07-18.
- Workspace-Dive reconciliation passed for three workspaces and nine relational mappings with zero mismatches, duplicate Dive IDs, unknown starters or cross-workspace results.
- MotherDuck smoke passed at five months, 929 house facts, six bedroom groups and rolling annual medians.
- `git diff --check` passed before the user committed and pushed the change.
- An anonymous local browser remained correctly blocked at sign-in. Authentication was not bypassed for visual QA.

The user subsequently confirmed the pushed production release passed and was correctly implemented. This is user verification, not independently captured Vercel deployment/log telemetry.

### Next gate

Phase 2A is complete and production-verified by the user. Scope the next phase separately; do not infer approval for a second dataset, generated TSX architecture, new build-contract enforcement, database migration or service-account change.

Before onboarding a second dataset, explicitly decide whether it can use the current workspace MotherDuck identity inside the same organization boundary or requires a separate service-account/workload boundary. Prefer one deliberately small fixture that tests the existing dataset/public-contract/editor-manifest interfaces before generalizing the VIC analytics APIs or provisioning topology.

For any future release that touches this flow, repeat an authenticated smoke of: question -> explicit starter -> prefilled editor draft -> manual Apply or deliberate cancellation -> correct dataset Data Contract -> verified new Dive version when applied. Confirm that opening the homepage alone creates no gallery embed sessions.

### Compact restart prompt

> Read `AGENTS.md`, this Phase 2A checkpoint, and the complete `vic-house-platform-operator` skill with its references. Phase 2A is production-verified by the user at commit `aa80102`: the homepage is question-led, starters and public contracts are server-derived, drafts remain reviewable and local, and live previews are lazy. Do not redo Phase 1B or Phase 2A. Separately scope the next general-system experiment and preserve VIC as a fixture rather than the product abstraction.

## Multi-dataset continuation checkpoint

This section is authoritative over older production, DuckDive and continuation notes below it.

### Reference point

- Branch: `main`.
- Reference commit: `9fd140d` (`Use dataset-specific contracts for DuckDive editing`).
- The working tree was clean at that commit before the handoff and Phase 1B changes.
- Phase 0, Phase 1A and the local/disposable-branch portion of Phase 1B are complete. Do not repeat them unless a read-only check shows drift.
- Next gate: review Phase 1B, then separately approve the production migration/deployment sequence. Migration 014 is not applied to production.

### Phase 0 completion

Phase 0 changed no application code. It established the production safety baseline:

- Tests, lint, TypeScript, local production build and preflight passed.
- VIC reconciled exactly to 83 source files and 88,422 observations, dated 2004-09-14 through 2026-07-18.
- MotherDuck query and Embedded Dive smoke passed.
- Production deployment `dpl_7xiZZAFYK3EABJ5nPJe1HZupg3k7` was `READY`, aliased to `https://duckdive.gold`, with Functions in `syd1`.
- Required Vercel production variable names were present; recent production logs contained only expected requests and no errors.
- MotherDuck Business was confirmed active.
- The authenticated owner Market Pulse lifecycle passed: deterministic copy-only edit, verified version/hash advance, refreshed embed, admin telemetry, Undo Version and persisted restoration.

### Phase 1A completion

Phase 1A introduced the first server-side dataset boundary without a migration, UI change or production resource change:

- `src/lib/datasets.ts` registers `vic-housing` with its semantic contract/version, existing starter keys, MotherDuck runtime selectors and editing/query/sharing capabilities.
- Registry validation rejects duplicate dataset keys, duplicate starter keys and unsafe MotherDuck database selectors.
- Existing workspace JSON Dive ownership resolves fail-closed from owned Dive ID to starter and dataset context.
- `/api/chat` now supplies dataset identity and contract version explicitly to DuckDive and records both in audit details.
- `inspect_data` queries the MotherDuck database resolved from the active dataset context instead of using a hard-coded global fallback.
- Unknown, unmapped or non-editable Dives remain denied. Existing VIC starter definitions, Dive IDs, route shapes and browser UI are unchanged.
- Tests cover registration, resolution, unsafe selectors, contract serialization, duplicate detection and dataset-bound query execution.

Phase 1A validation passed:

- 17 test files / 45 tests.
- TypeScript.
- Production build.
- Preflight.
- Live MotherDuck smoke: five months, 929 house facts, six bedroom groups and rolling annual medians.
- ESLint had zero errors; the existing 17 warnings remained confined to the checked-in `vercel-optimize` skill package.

### Phase 1B completion and review gate

- `db/014_workspace_dives.sql` adds `app.workspace_dive` with workspace/starter primary ownership, globally unique owned Dive IDs, registered dataset/starter identity, source Dive lineage and fail-fast backfill checks.
- The migration preserves `app.workspace.dive_ids` and `source_dive_ids` unchanged. Application provisioning now writes the JSON rollback representation and relational ownership in one transaction.
- Chat, edit, gallery, embed, version, revert, reset and share-management ownership checks now resolve through `app.workspace_dive`. Unknown, incomplete, dataset-mismatched and cross-workspace ownership fails closed.
- `scripts/reconcile-workspace-dives.ts` proves exact legacy/relational parity, complete owned lookups, registered starters, unique Dive IDs and zero cross-workspace matches.
- A disposable Neon branch cloned from production received migration 014. It contained three workspaces and nine paired VIC mappings; all nine backfilled exactly with zero mismatches, duplicates, unknown starters or cross-workspace matches.
- Migration SQL reapplied successfully, and the migration runner subsequently skipped 014 from the ledger. No MotherDuck Dive or production resource was created, updated or deleted.
- Validation passed: 18 test files / 49 tests, TypeScript, production build, preflight, VIC reconciliation at 83 files / 88,422 observations / unchanged date bounds, and MotherDuck smoke at five months / 929 facts / six bedroom groups / rolling medians.
- ESLint has zero errors; the existing 17 warnings remain confined to the checked-in `vercel-optimize` skill package.
- No homepage or visual changes were made.

Review gate: do not apply migration 014 to production, deploy the relational cutover, or begin the question-led homepage without a separate approval. The safe production order is migration -> exact ownership reconciliation -> deploy -> authenticated owner/cross-workspace route smoke -> production log inspection.

### Phase 1B production release

- User approved the breaking production release and pushed commit `8d4d180` (`Enforce relational workspace Dive ownership`) to `main`.
- Vercel Git deployment `dpl_EVPoNS16godrhou9FhwNSt8q3ePG` is `READY`, targets production, is aliased to `https://duckdive.gold`, and runs Functions in `syd1`.
- Production Neon migration `014_workspace_dives.sql` is applied.
- Production reconciliation passed for three workspaces: nine legacy owned rows, nine legacy source rows and nine relational rows, with zero mismatches, duplicate Dive IDs, unknown starters or cross-workspace matches.
- The immutable VIC baseline still reconciles to 83 files and 88,422 observations with date bounds 2004-09-14 through 2026-07-18.
- Production preflight and MotherDuck smoke passed: five months, 929 house facts, six bedroom groups and rolling annual medians.
- Vercel logs for the release interval contained only 23 expected informational `/`, `/login`, `/edit` and `/api/gallery` requests, with no warnings or errors.
- The Git-triggered deployment became ready before migration 014 was applied. This created a possible brief missing-table interval, but the captured release logs contained no error and code/database are now aligned.
- Anonymous `/edit` correctly redirected to `/login`; authentication was not bypassed.
- The authenticated owner production smoke passed: `/edit` retained Market Pulse, Suburb Story and Market Matchup across refresh, and an existing Dive embed/version loaded without error.

Phase 1B is fully released and user-verified. The next phase must be scoped separately; do not infer approval for the question-led homepage or another multi-dataset implementation batch from this release.

### Compact restart prompt

> Read `AGENTS.md`, this top checkpoint, and the complete `vic-house-platform-operator` skill with its references. Phase 1B is fully released and owner-verified at commit `8d4d180` / deployment `dpl_EVPoNS16godrhou9FhwNSt8q3ePG`, with production migration 014 applied. Separately scope the next multi-dataset/question-led homepage phase before implementation.

## Verified DuckDive editing release update

This section is authoritative over older DuckDive/admin/AI notes below it.

- Production deployment `dpl_AUtHYca9SNkBoSBD975ezkogo1hR` is READY and aliased to `https://duckdive.gold`; Next.js Functions remain in `syd1`.
- Additive Neon migration `013_duckdive_runs.sql` is applied. It adds durable `app.duckdive_run` state with one active run per workspace/Dive, stale-run recovery, versions/hashes, outcomes, duration and token usage.
- DuckDive now defaults to AI Gateway model `openai/gpt-5.6-sol` and receives the active Dive source/version plus an application-owned VIC semantic and visual contract.
- The model has only two application-owned tools: a governed, single-statement, read-only, 200-row `inspect_data` query and `save_dive_revision`, which forces the active Dive and permits only one mutation attempt.
- A save is reported only after the MotherDuck version advances, the source SHA-256 changes and a fresh embed session succeeds. The client polls `GET /api/duckdive/runs/[runId]` and refreshes only for an `applied` outcome.
- Full UI messages and compact tool outcomes are persisted. The three starter Dives maintain separate mounted conversations, so tab changes cannot share agent context.
- The editor now has a 4,000-character brief, accurate character count, meaningful phases, explicit clarification/no-change/failure/aborted states, an on-demand semantic Data Contract, and a confirmed/version-guarded Reset to Starter that creates another reversible version.
- `/admin` is deployed with 24-hour applied/failed/clarified DuckDive counts and median duration/token usage. Audit events cover applied, clarification, failed, aborted and reset outcomes. Existing per-user/global hourly AI admission limits are unchanged.
- Validation passed: 16 test files / 40 tests, TypeScript, production build, preflight, full 83-file/88,422-row reconciliation and live MotherDuck smoke. ESLint has zero errors; its 17 warnings are confined to the checked-in `vercel-optimize` skill package.
- Post-deploy runtime logs contained only expected `/`, `/edit` and `/login` requests with no errors. An isolated anonymous browser correctly redirected `/edit` to `/login`.
- Remaining release check: use an authenticated owner browser to record the current Market Pulse version, submit one deterministic copy-only change, verify the persisted `applied` run/new version/refreshed embed/admin telemetry, then use Undo Version or Reset to Starter and verify restoration. This could not be completed in the isolated browser because it had no owner session; do not bypass authentication.

## Auth phase continuation update

The allowlisted Neon Auth implementation is deployed to production at `https://duckdive.gold`. Production credential, trusted-origin, provider, webhook, and OAuth verifier configuration are complete. GitHub login now persists and the owner reaches the private editor. The remaining auth release work is a controlled revoked-user smoke test.

- Production Neon migrations `010_allowlisted_neon_auth.sql` and `011_auth_webhook_response.sql` are applied.
- Production currently has one linked active `app.app_user` row and one workspace for `rossfarrell7@gmail.com`.
- The main app, Dives, gallery, stats, analytics, chat, edit, personal embed/version/revert, and share-management routes now require an active allowlisted Neon Auth session.
- `/share/*` remains public, no-index, view-only, and capability-based. `POST /api/ingest` remains protected only by `INGEST_SECRET`.
- Magic-link requests are allowlist-gated and non-enumerating. A signed `user.before_create` webhook provides a second fail-closed signup gate.
- `send.magic_link` webhook delivery uses Resend after verifying Neon's rotating Ed25519/JWKS signature, timestamp, event ID/type, and an idempotent persisted response.
- Password login, password hashing, `editor:create`, and the legacy application session cookie are removed. Owner commands are `access:add`, `access:revoke`, and `access:list`.
- Current local validation: 10 test files / 28 tests passed; lint, TypeScript, local production build, Vercel production build, `db:reconcile`, and `smoke:motherduck` pass.
- Vercel Production and Preview now contain `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`; `NEXT_PUBLIC_SITE_URL` is configured for Production, Preview, and Development. Secret values were transferred without printing them.
- `https://duckdive.gold` is attached to the Vercel production project with valid configuration and its Resend domain is verified. Use `DuckDive <noreply@duckdive.gold>` as the sender and `https://duckdive.gold` as the canonical application origin.
- Neon Auth application name is `DuckDive`; trusted origins contain exactly `https://duckdive.gold`; GitHub initiation returns a valid OAuth redirect.
- OAuth persistence fix: `src/proxy.ts` runs Neon Auth middleware only when `neon_auth_session_verifier` is present, cookies use `SameSite=Lax`, the catch-all handler exports GET and POST, and new/existing GitHub users share `/auth/complete`. Production initiation now sets a Secure, HttpOnly Lax challenge cookie.
- The blocking Neon Auth webhook is enabled at `https://duckdive.gold/api/webhooks/neon-auth` for exactly `User Before Create` and `Send Magic Link`. A live allowlisted magic-link request returned 202 and its signed webhook returned 200 after Resend delivery.
- `rossfarrell7@gmail.com` is the first active production allowlist administrator.
- Vercel Functions are explicitly pinned to Sydney (`syd1`) through `vercel.json`, beside the Sydney Neon/Auth estate. Before/after warm measurements improved anonymous auth/API checks from about 0.5-1.0 seconds to 0.13-0.42 seconds and the unlisted magic-link authorization path from about 6.0 seconds to 0.10-0.38 seconds.
- Production AI incident: Vercel Functions expose OIDC through request context rather than `process.env.VERCEL_OIDC_TOKEN`. The original provider guard rejected production before AI SDK authentication. `src/lib/ai-provider.ts` now returns the Gateway model as a plain string on Vercel so AI SDK can consume runtime OIDC; the project OIDC setting is verified enabled with team issuer mode.
- A private `/admin` dashboard is implemented locally but not yet deployed. It is restricted to active `admin` users and manages allowlist add/reactivate/revoke without deleting identity or history. It reports aggregate AI/login/chat/share/audit activity, prevents self/last-admin lockout, and records access changes in `app.audit_event`.
- AI admission now has two strict hourly caps: 20 per user and 100 globally by default. A PostgreSQL advisory transaction lock serializes the count-and-insert decision so concurrent requests cannot overshoot the global cap. Configure with `AI_REMIX_REQUESTS_PER_HOUR` and `AI_REMIX_GLOBAL_REQUESTS_PER_HOUR`.
- Migration `012_public_share_throttle.sql` is applied in production Neon; its application code is implemented locally but not yet deployed. Anonymous share loads are capped before MotherDuck session creation at 30 per visitor/link and 300 globally per hour by default. Only a secret-salted IP+slug hash is retained, never a raw IP.
- Browser-visible MotherDuck embed sessions and CloudFront signed object URLs are expected short-lived bearer capabilities, not account credentials. Never log or persist them; the admin token remains server-only.

Remaining production sequence:

1. Revoke/reactivate the owner once to prove fail-closed authorization without losing the stable `app_user.user_id`.
2. Optionally execute a direct non-allowlisted signup attempt to exercise `User Before Create`; the public request-link endpoint already returns the same generic 202 for an unlisted address without contacting Neon.
3. Remove legacy Vercel `AUTH_SECRET` only after the revoked-user path passes.
4. Deploy and smoke the new `/admin` access-management surface, then complete the authenticated `/api/chat` smoke with the corrected runtime OIDC path.

The older objective notes below describe the design context and pre-implementation state; this continuation update is authoritative where they differ.

## Suggested bootstrap prompt

> Read `AGENTS.md`, `NEXT_SESSION_HANDOFF.md`, and the complete `vic-house-platform-operator` skill. Continue from the verified production state; do not reprovision Neon, MotherDuck, Dives, or share links unless inspection proves it necessary. Implement the next objective: allowlisted Neon Auth with magic-link login and Resend delivery, while preserving `/share/*` as the intentional public read-only capability route. Start with read-only verification and tell me the smallest human dashboard/credential action that materially unblocks you.

## Start here

1. Read `AGENTS.md` and `.agents/skills/vic-house-platform-operator/SKILL.md` plus its three references.
2. Read this file completely before changing local or external state.
3. Run `git status --short`, `git log -1 --oneline`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`.
4. Reverify time-sensitive external state before acting. Never copy credentials into chat, source, commands, or this file.

## Source and production state

- Repository: `C:\Users\rossf\Desktop\vic-house-data-lab`
- Branch: `main`
- Current base commit: `f0ec9e4` (`Document session handoff requirements`).
- The auth and DuckDive changes are an intentionally uncommitted working tree.
- Vercel project: `big-team/vic-house-data-lab`
- Canonical production URL: `https://duckdive.gold`
- Current production deployment: `dpl_537cPQ3boukDtYNZzJ83uurjbxwe` (READY, aliased to `duckdive.gold`, Functions verified in `syd1`).
- Neon project shown by the user: `neon-vic-house-data`; keep it isolated from WA or unrelated estates.
- Migration `009_dive_shares.sql` is applied in production Neon.
- Production now has one linked owner row in `app.app_user` and one workspace. Query counts again before any future auth migration.

## What is genuinely live

- Neon contains the complete immutable VIC archive: 83 CSVs and 88,422 source observations.
- Reconciliation passed with dates `2004-09-14` through `2026-07-18`.
- Neon serving counts last verified: 70,430 properties, 84,949 listings, and 84,640 sales.
- Native MotherDuck database `vic_house_data` contains:
  - `suburb_dimension`: 70 VIC House suburbs
  - `suburb_monthly_sales`: 11,110 rows
  - `suburb_sale_facts`: 83,598 rows
- Automatic organization share `vic_house_data_app` exists and `MOTHERDUCK_SHARE_URL` is configured in Vercel Production and Preview.
- MotherDuck service account `vic_house_lab` exists.
- Application Dives exist and are owned by `vic_house_lab`:
  - VIC Market Pulse: `5323b2cb-5b06-4925-8c72-8b707f90fb34`
  - Suburb Story: `9a6c0ef2-fb2a-46a7-ada5-ce8951b5ac6c`
  - Market Matchup: `59154f83-fe49-4fe4-ac56-d61fc462a815`
- `/api/stats`, MotherDuck analytics routes, `/api/gallery`, and all three Embedded Dives returned live data.
- The production UI was visually inspected after correcting reserved SQL aliases; it had zero Dive query errors.

## Unlisted Dive sharing

This feature is implemented, migrated, documented, deployed, and production-smoked.

- Authenticated owners manage a personal Dive through `GET|POST|DELETE /api/dives/[diveId]/share`.
- `POST` creates an unlisted, read-only `/share/<slug>` URL and is idempotent while the share is active.
- Slugs use an 80-bit random suffix and are stored in `app.dive_share`.
- Public resolution accepts only a valid active/unexpired slug; it never accepts a raw public Dive ID.
- Each page load mints a fresh short-lived MotherDuck embed session.
- Share pages are `noindex`, view-only, revocable, and return 404 after revocation.
- Editor controls are `Publish link`, `Copy link`, and `Revoke link` in `src/components/EditLab.tsx`.
- Production lifecycle passed: anonymous 200/render, zero query errors, revoke, same slug 404, exact QA cleanup.
- No QA share or QA user was left behind. The test identity is exactly `qa-share-link@invalid.local`.
- Repeatable harness:

```powershell
pnpm smoke:share create
# Open the emitted production slug anonymously.
pnpm smoke:share revoke
# Confirm the same URL returns 404.
pnpm smoke:share cleanup
```

Always run cleanup if the smoke sequence is interrupted.

## Validation at handoff

- 8 test files / 23 tests passed.
- ESLint passed.
- TypeScript passed.
- Local and Vercel production builds passed.
- `db:reconcile` passed all immutable baseline checks.
- `smoke:motherduck` passed.
- Repo-local operator skill validation passed.
- Secret-pattern scan passed.
- Recent production logs contained only expected share-page GET requests, no runtime errors.

## Environment state (names only)

Vercel Production and Preview contain the Neon integration variables, Neon Auth variables, Resend variables, `MOTHERDUCK_TOKEN`, `MOTHERDUCK_SHARE_URL`, legacy `AUTH_SECRET`, `INGEST_SECRET`, Blob integration variables, estate variables, and MotherDuck endpoint selectors. `NEXT_PUBLIC_SITE_URL` is set across Production, Preview, and Development.

Known missing capability variables:

- No static `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AI_GATEWAY_API_KEY` is configured. Vercel AI Gateway OIDC is active: `pnpm smoke:ai-gateway` successfully streamed through `openai/gpt-5.6-sol`. The application defaults to Gateway model `openai/gpt-5.4`; authenticated `/api/chat` remains the final AI release smoke.
- Neon Auth is provisioned; GitHub, Magic Link, trusted origins, and the blocking webhook are configured and production-verified.
- Resend is configured with a verified `duckdive.gold` domain and the application sender `DuckDive <noreply@duckdive.gold>`.

Local credential posture:

- `.env.local`, `.env.blob`, and `.vercel` are ignored.
- Local Neon URLs and a MotherDuck operator token were usable at handoff. Inspect only presence/placeholder state; never print values.
- Vercel Sensitive variables pull locally as literal `[SENSITIVE]`; ask the human for a direct dashboard-to-ignored-file handoff when needed.
- Local `pnpm preflight` currently also lacks `MOTHERDUCK_SHARE_URL`; production Vercel still has the variable and the live MotherDuck smoke passes. Restore the share URL to ignored `.env.local` before relying on local preflight.

## Highest-priority next objective: allowlisted Neon Auth

User intent: make the main application personal and allowlist-only, using Neon Auth magic links and Resend for email delivery. Preserve unlisted `/share/*` links as the deliberate public, view-only exception unless the user changes that policy.

Recommended authorization design:

1. Provision Neon Auth on the production branch of the existing isolated Neon project. Reverify the current official Neon Auth SDK and Magic Link documentation before coding; the product changed materially in 2026.
2. Use Neon Auth only to prove identity. Keep application authorization in Neon `app` schema.
3. Evolve `app.app_user` additively into the allowlist/profile table:
   - make `password_hash` nullable during transition;
   - add unique nullable `auth_subject` (Neon Auth user ID);
   - add constrained `role` (`member`/`admin` is sufficient initially);
   - add constrained `status` (`active`/`revoked`);
   - add invitation and last-login timestamps.
4. On a valid Neon Auth session, normalize the verified email and atomically link it only to an existing active allowlist row. Never auto-allow a newly authenticated email.
5. Once Neon Auth works end to end, remove the password login UI/routes and password helper. Preserve existing `user_id` values so workspace, chat, quota, audit, and share foreign keys remain stable.
6. Add owner commands such as `access:add`, `access:revoke`, and `access:list` that do not print secrets.
7. Route policy:
   - Require active allowlisted sessions for `/`, `/dives/*`, `/edit`, gallery/stats/analytics APIs, chat, personal embed/version/revert, edit, and share-management APIs.
   - Keep `/share/*` public capability URLs, no-index and read-only.
   - Keep Neon Auth handlers/callbacks and the login/request-link page public.
   - Keep `POST /api/ingest` protected by `INGEST_SECRET`, not user cookies.
8. Resend is transport only, never authorization. Prefer placing its API key in ignored `.env.local` and Vercel Sensitive variables. Validate webhook signatures if Neon Auth webhooks are used.
9. Test denied paths as seriously as successful login: non-allowlisted verified email, revoked member, expired/replayed magic link, unauthenticated APIs, cross-origin writes, revoked share slug, and preserved `/api/ingest` behavior.

Human handoff likely required:

- If no Neon MCP/API is available, ask Ross to enable Neon Auth for the production branch in the Neon Console and enable the Magic Link plugin, then place the emitted base URL into ignored `.env.local` as `NEON_AUTH_BASE_URL`.
- Ask Ross to place a Resend API key in ignored `.env.local` as `RESEND_API_KEY` and provide the verified from-address/domain name (the address is configuration, not a secret).
- Generate `NEON_AUTH_COOKIE_SECRET` locally (at least 32 characters) and set the same stable value in Vercel Production/Preview; do not rotate casually because it invalidates sessions.

## Other deferred items

### AI remixing

Vercel AI Gateway credits and OIDC are active. Refresh local authentication with `vercel env pull .env.ai-gateway.local --yes --environment=development`, then run `pnpm smoke:ai-gateway`. The verified standalone smoke uses `openai/gpt-5.6-sol`; the application defaults to `openai/gpt-5.4`. A static Gateway key is optional. Run `pnpm preflight` after supplying the separate missing MotherDuck share URL, then exercise `/api/chat` through the authenticated workspace.

### Vercel Blob archive

The immutable CSV archive was not uploaded. Local Vercel OIDC carried a `development` claim while the Blob project connection allowed only Production/Preview. Either enable the project’s Development connection on the Blob store or place a dedicated Blob read/write token in ignored `.env.blob`, then run `pnpm archive:blob`. The previous failure happened before writes, so no partial archive was created.

### MotherDuck billing

The user showed a MotherDuck Business trial with five days remaining on 2026-07-30. This is time-sensitive: reverify current plan/billing immediately in the next session so Embedded Dives and service accounts do not lapse.

## Safety and continuity rules

- Never repeat or rotate the Neon URL/password the user previously pasted unless explicitly asked. The user accepted the exposure risk.
- Do not recreate `vic_house_data`, republish data, or recreate Dives unless verification shows they are missing or stale.
- Do not touch the unrelated MotherDuck Fabric Dive/database.
- Do not expose MotherDuck tokens, Neon URLs, Resend keys, embed-session tokens, or magic-link tokens in logs or chat.
- Do not claim the allowlist launch is complete until authenticated and denied production paths both pass.
- Preserve the 83-file/88,422-row baseline and the analytics semantics in the operator skill.
- Prefer a quick human dashboard action or ignored-file credential handoff over elaborate credential-recovery workarounds.

## Useful first commands

```powershell
git status --short
git log -1 --oneline
pnpm test
pnpm lint
pnpm typecheck
pnpm db:status
pnpm db:reconcile
pnpm smoke:motherduck
vercel env ls production
vercel logs duckdive.gold --since 15m --no-follow
```

Do not run `pnpm preflight` expecting success until the missing local `MOTHERDUCK_SHARE_URL` is supplied. AI preflight now accepts the verified Vercel OIDC token.
