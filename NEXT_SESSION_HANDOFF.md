# Next session handoff

Last verified: 2026-08-05 (Australia/Perth)

Phase 2C-B is Released. Its historical Vercel function-log interval remained inaccessible; on 2026-08-05 the owner explicitly accepted a fresh attributable smoke package as substitute evidence. Signed-in production `/`, `/admin`, and `/datasets/new` rendered without application or browser-console errors, while anonymous `/datasets/new` redirected to login and protected dataset, draft, and stats APIs returned 401. This proves current behavior rather than the absence of errors in the historical interval.

Phase 2C-C Gates 1–4 are complete at the local, production-schema, disposable-runtime, and cleanup boundaries. Implementation commit `766e9fe` exists locally but is not pushed, deployed, or activated for a retained operational dataset. Production migrations 017 and 018 are applied and idempotent; the dedicated MotherDuck identity `duckdive_who_phase2cc` remains, while every generated read-scaling token expires after 15 minutes and no QA dataset or binding remains.

## Restart point

- **Repository**: `C:\Users\rossf\Desktop\vic-house-data-lab`
- **Branch**: `main`
- **Verified commit**: `08a9bd6` (`Add operational dataset registry activation flow`)
- **Source state**: local `main` is at implementation commit `766e9fe`; `origin/main` and `origin/HEAD` remain at `c3777bc`
- **Current phase**: Phase 2C-C complete at its declared non-Dive boundary; release and runtime activation remain pending
- **Production state**: Vercel deployment `dpl_ZLkeovEMWfd1HbsTcL34ta44bTqc` completed successfully from `08a9bd6`; Neon migration 016 was applied on 2026-08-04 and skipped on rerun
- **Next gate**: configure production `MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME=duckdive_who_phase2cc`, then push `766e9fe` plus the evidence handoff, deploy, inspect the new release interval, and run authenticated runtime-route smokes before Phase 2C-D

Do not repeat migration 016 or the production QA smoke without drift evidence. No retained QA draft, operational dataset, binding, cross-owner identity, runtime resource, SQL, MotherDuck mutation, or Dive remains.

## Authority and status

Use the repository documents in this order:

1. `AGENTS.md` defines repository operating rules
2. This handoff defines verified commits, validation, production state, and the immediate restart gate
3. `MULTI_DATASET_DELIVERY_PLAN.md` defines product scope, phase order, and exit criteria

The delivery plan's final `Current next gate` now records the Phase 2C-C release boundary and keeps Phase 2C-D closed. Do not reopen Phase 2C-A or repeat Phase 2C-B implementation or production QA unless read-only verification proves drift.

Status terms follow the delivery plan:

- **Released**: committed, deployed, migrated where required, and owner-verified
- **Complete**: implemented and validated at the phase's declared boundary
- **Current**: approved direction and next implementation target
- **Candidate**: retained intent that still needs a product or operating decision
- **Deferred**: outside the active delivery sequence

## Phase 2C-B completion evidence

Phase 2C-B adds a workspace-owned operational registry without connecting a runtime resource or creating a Dive.

The implementation commit is `d0d08f5`. Commit `36ffc64` records the disposable-database rehearsal. Commit `08a9bd6` is the deployed Git reference point and consolidates this restart-oriented handoff.

### Implemented boundary

- `db/016_operational_datasets.sql` adds the operational dataset registry, runtime-binding table, lifecycle checks, immutable reviewed-draft provenance, and content-free audit events
- Activation is transactional and idempotent for the same workspace and reviewed contract
- Owner, workspace, draft, and cross-workspace checks fail closed without disclosing another workspace's record
- Deleting a reviewed draft referenced by an operational dataset returns 409
- `GET /api/datasets`, `GET/PATCH /api/datasets/[datasetId]`, and `POST /api/dataset-drafts/[draftId]/activate` are authenticated, owner-scoped, private, and `no-store`
- Owners may archive an unbound dataset but cannot mark it runtime-ready through the public lifecycle route
- Static VIC and relational operational datasets resolve through one server-owned interface
- `/datasets/new` registers reviewed evidence explicitly and lists static and relational datasets without claiming a data connection, generated Structured Query Language (SQL), or Dive

### Validation boundary

- 31 test files and 98 tests passed
- TypeScript and the production build passed
- ESLint reported zero errors; the existing 17 warnings remained inside the checked-in `vercel-optimize` skill package
- `git diff --check` passed
- The production preview component passed synthetic visual checks at 1440 x 900 and 390 x 844 without mobile overflow
- Migration 016 applied once to a disposable Neon branch and skipped on rerun
- Disposable database checks passed for idempotent activation, cross-workspace denial, lifecycle limits, draft retention, archive state, and content-free audits
- Cleanup returned zero disposable users, workspaces, drafts, and operational datasets
- Production migration 016 applied at `2026-08-04T14:36:38.482Z` and skipped on an immediate rerun
- GitHub's Vercel deployment record proves successful Production deployment `dpl_ZLkeovEMWfd1HbsTcL34ta44bTqc` from commit `08a9bd6`
- Authenticated production QA passed: synthetic browser-local review, idempotent draft save, deterministic activation preview, registration, identical repeat registration, static-plus-relational listing, activated-draft 409 protection, cross-owner read/write denial, invalid reviewed-to-ready rejection, owner archive, and content-free audit inspection
- The QA operational dataset remained runtime-unbound; no SQL, MotherDuck resource, binding, share, or Dive was created
- Cleanup verification returned zero QA drafts, operational datasets, bindings, and cross-owner identities; the VIC baseline remained 83 files and 88,422 observations
- Public checks returned the expected `/datasets/new` 307 redirect and 401 responses for protected dataset, draft, and stats APIs
- No credential, MotherDuck, Vercel configuration, or Dive mutation occurred

The agent left the disposable Neon branch intact. Treat branch cleanup as an owner action if it still exists.

## Phase 2C-B substitute release evidence

The historical function-log interval for deployment `dpl_ZLkeovEMWfd1HbsTcL34ta44bTqc` was not recoverable through the available identities. The owner approved fresh current-state smoke evidence as the closure mechanism on 2026-08-05.

- A signed-in owner session rendered `/`, `/admin`, and `/datasets/new` without login fallback, application-error text, or browser console warnings/errors
- Anonymous `/datasets/new` returned 307 to login; `/api/datasets`, `/api/dataset-drafts`, and `/api/stats` returned 401
- Production migration status and VIC counts remained healthy before Phase 2C-C work: 83 files and 88,422 observations
- The earlier authenticated Phase 2C-B activation, denial, archive, audit, and cleanup smoke remains valid evidence

Phase 2C-B is therefore **Released** under the revised owner-approved evidence rule. Do not describe the historical log interval itself as inspected or clean.

## Next implementation phase: Phase 2C-C

Phase 2C-C binds the public World Health Organization (WHO) air-quality fixture through one disposable, read-only MotherDuck runtime. Its repository policy, live schema reconciliation, bounded query, disposable binding, revocation, isolation, and cleanup gates have passed. The code remains undeployed and no operational fixture binding is retained.

### Scope

- Keep browser traffic behind the Next.js backend
- Store a non-secret resource reference separately from the reviewed semantic contract
- Use a dedicated workload or service-account boundary for application access
- Allowlist tables, dimensions, measures, filters, and result limits
- Compare the reviewed contract with live columns before marking the dataset ready
- Keep unrelated `fabric_audit_analytics`, Fabric engagement, and VIC resources out of scope
- Defer read scaling until measured concurrency requires it

### Gate 1 local completion evidence

- `src/lib/operational-runtime-policy.ts` defines the `motherduck-pg` adapter contract and fixes the only approved resource to `sample_data.who.ambient_air_quality`
- Structured query requests accept selected fields, bounded filters, ordering, and a server-owned limit of at most 500 rows; they do not accept SQL
- Selected fields and filters must be present in both the WHO adapter policy and the owner-reviewed public contract
- The approved PM2.5 aggregate mapping is bound to the exact reviewed DAX evidence fingerprint; matching a measure name alone cannot authorize execution
- Values remain positional parameters; identifiers and operators come only from fixed allowlists; mixed dimension and aggregate requests add deterministic grouping
- Owner, dataset, adapter, resource, and `ready` binding state must all match before compilation; binding, degraded, revoked, cross-owner, and cross-dataset contexts fail closed
- Reconciliation records exact, unacknowledged variance, or explicitly acknowledged variance; a different resource is never acknowledgeable
- 32 test files and 103 tests passed, including five new runtime-policy tests
- TypeScript and the production build passed
- ESLint reported zero errors; the existing 17 warnings remain confined to the checked-in `vercel-optimize` skill package
- No database, credential, MotherDuck, Vercel, runtime binding, SQL execution, or Dive mutation occurred

### Gates 2–4 completion evidence

- The owner approved `duckdive_who_phase2cc` as the dedicated disposable identity and fresh smokes as the Phase 2C-B evidence substitute
- MotherDuck issued only 900-second `read_scaling` tokens; token values remained process-local and were never printed or persisted
- Live `sample_data.who.ambient_air_quality` inspection returned 20 columns and 40,098 rows; the corrected reviewed fixture reconciled exactly
- The runtime query returned five bounded aggregate rows; arbitrary SQL, unknown fields, VIC resources, cross-owner context, and revoked bindings failed closed
- Migration 017 persists reconciliation fingerprints, acknowledged variance codes, timestamps, degraded state, and revocation state without credentials or live column content
- The first lifecycle smoke exposed migration 016's unsupported `{0,299}` PostgreSQL regular-expression bound; cleanup returned zero QA rows
- Migration 018 replaced that latent constraint with an explicit 1–300 length check and safe-character expression
- Migrations 017 and 018 applied once in production and skipped on rerun
- The successful lifecycle created one `.invalid` QA owner, reviewed contract, operational dataset, and runtime binding; reconciled exactly, queried five rows, denied a random cross-owner identity, revoked the binding, and made it unavailable
- Audit events were limited to `operational_runtime.binding_started`, `operational_runtime.reconciled`, and `operational_runtime.revoked`, without contract content
- Cleanup returned zero QA users, datasets, and bindings; VIC remained 83 files and 88,422 observations
- 36 test files and 117 tests, TypeScript, production build, and preflight passed; ESLint reported zero errors and the unchanged 17 checked-in skill warnings
- No MotherDuck database, share, table, Dive, copied fixture, retained operational dataset, or retained binding was created

The owner approved the completed disposable identity, expiring token, QA binding, and cleanup rehearsal. Any further MotherDuck user, token-policy, share, database object, Data Definition Language (DDL) object, retained runtime binding, or Dive mutation requires a new explicit approval.

### Exit gate

Phase 2C-C is complete only when:

- Contract-to-column reconciliation passes exactly or records an acknowledged variance
- Unknown tables and columns fail closed
- Queries are read-only, single-statement, bounded, and routed server-side by dataset
- The fixture context cannot reach a VIC row or resource
- Revoking the binding makes the fixture unavailable without affecting VIC

Phase 2C-D remains the single governed WHO Dive after this gate. Phase 2C-E remains the integrated release and reconciliation gate.

## Released platform baseline

The following baseline constrains Phase 2C-C and later work.

| Phase or capability | State | Current contract |
|---|---|---|
| Phase 0 | Complete | Preserve the immutable VIC baseline: 83 files, 88,422 observations, and dates from 2004-09-14 through 2026-07-18 |
| Phase 1A | Released | `src/lib/datasets.ts` resolves the static `vic-housing/v1` dataset and fails closed for unknown context |
| Phase 1B | Released | `app.workspace_dive` is the relational Dive-ownership authority; migration 014 and reconciliation enforce workspace isolation |
| Phase 2A | Released and user-verified | Questions remain browser-local drafts until the owner chooses a trusted starter and presses **Apply** |
| Phase 2B | Released and owner-verified | Browser-local semantic-model review stores private `ReviewedSemanticContractV1` evidence without raw archives or connectivity details |
| Phase 2C-A | Complete and pushed | Deterministic activation preview compiles reviewed evidence without persistence, SQL generation, runtime access, or Dive creation |
| Phase 2C-B | Released under owner-approved fresh-smoke evidence substitution | Operational registration persists owner-scoped evidence while runtime binding remains separate |
| Phase 2C-C | Complete at local commit `766e9fe`; not pushed or deployed | WHO runtime policy, exact live reconciliation, bounded server query, revocation, isolation, migrations, and cleanup passed |
| Allowlisted Neon Auth | Released | Identity and application authorization remain separate; protected routes require an active allowlisted session |
| Unlisted sharing | Released | `/share/*` remains the only intentional public, no-index, read-only capability route |

Phase 2B production release evidence remains `1512075` and Vercel deployment `dpl_2DQprmEiqmKmtxhtVcgqJiWE82D7`. The operator applied migration 015 after the deployment became ready. Authenticated create, idempotent resave, reload, and delete checks then passed with zero retained quality-assurance rows.

## Authentication support note

DuckDive magic links must open in the browser profile that requested them. The requesting profile contains the browser-local Neon Auth challenge cookie.

A Hotmail test account received its sign-in email. Opening the first link in another browser profile returned safely to login without creating a session. A fresh link opened in the requesting profile completed sign-in. No auth, Resend, allowlist, credential, or code change was required.

Treat a clearer missing-challenge message as optional future user-experience work, not a Phase 2C blocker.

## Production and credential constraints

- Canonical production URL: `https://duckdive.gold`
- Vercel project: `big-team/vic-house-data-lab`
- Neon project: `neon-vic-house-data`; keep it isolated from WA and unrelated estates
- Native MotherDuck database: `vic_house_data`
- MotherDuck application identity: `vic_house_lab`
- Static production Dives: VIC Market Pulse, Suburb Story, and Market Matchup
- Vercel Functions are pinned to Sydney (`syd1`)
- Vercel Sensitive values pull locally as `[SENSITIVE]`; use a direct dashboard-to-ignored-file handoff when local access is required
- Use pooled `DATABASE_URL` for application traffic and unpooled `DATABASE_URL_UNPOOLED` for migrations
- Never print Neon URLs, MotherDuck tokens, Resend keys, embed-session tokens, magic-link tokens, or browser cookies
- Reverify MotherDuck plan and billing before relying on service-account or Embedded Dive availability

Do not recreate `vic_house_data`, republish VIC data, recreate static Dives, rotate credentials, alter integrations, or touch unrelated Fabric resources unless read-only evidence and owner approval require it.

## Closed and deferred work

Keep these gates closed while Phase 2C-C is active:

- Phase 2C-D governed Dive provisioning
- WA Housing or another real external dataset
- Fabric connectivity or execution of Data Analysis Expressions (DAX)
- Perth Airspace ingestion or aviation infrastructure
- Public sharing for new datasets
- Autonomous Dive generation or a parallel renderer/chat system
- Vercel Blob archive work
- Removal of compatibility paths or legacy environment variables

The delivery plan retains the detailed candidate requirements for WA, aviation, later multi-dataset hardening, and the definition of done.

## Session bootstrap

Read the operator skill before any production, credential, database, Vercel, MotherDuck, or incident work:

```powershell
Get-Content -Raw .agents\skills\vic-house-platform-operator\SKILL.md
git status --short
git log -3 --oneline --decorate
pnpm db:status
```

Run build-sensitive checks sequentially:

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run reconciliation or live smokes only when they are relevant to the approved gate and required environment values are present. Do not run `pnpm preflight` expecting success until the ignored local environment contains `MOTHERDUCK_SHARE_URL`.
