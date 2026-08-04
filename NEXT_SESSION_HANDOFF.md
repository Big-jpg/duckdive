# Next session handoff

Last verified: 2026-08-04 (Australia/Perth)

Phase 2C-B code, migration, and authenticated production behavior are verified. Production serves commit `08a9bd6`; migration 016 is applied and idempotent; the owner-scoped activation, denial, archive, audit, and cleanup smoke passed. The only remaining release-evidence item is the relevant Vercel function-log interval, which was not accessible through the available GitHub deployment record or local runtime identity. Capture that read-only evidence before changing Phase 2C-B from production-verified to formally Released. Phase 2C-C Gate 1 is complete locally; its external runtime boundary is not yet approved.

## Restart point

- **Repository**: `C:\Users\rossf\Desktop\vic-house-data-lab`
- **Branch**: `main`
- **Verified commit**: `08a9bd6` (`Add operational dataset registry activation flow`)
- **Source state at Phase 2C-C assessment**: clean `main` was aligned with `origin/main` and `origin/HEAD` at documentation commit `5c83a20`; production remains on application commit `08a9bd6`
- **Current phase**: Phase 2C-B is production-deployed, migrated, and owner-smoked; Vercel function-log evidence remains pending
- **Production state**: Vercel deployment `dpl_ZLkeovEMWfd1HbsTcL34ta44bTqc` completed successfully from `08a9bd6`; Neon migration 016 was applied on 2026-08-04 and skipped on rerun
- **Next implementation phase**: Phase 2C-C Gate 2 read-only reconciliation, after the remaining release-log check and approval of the exact disposable runtime identity

Do not repeat migration 016 or the production QA smoke without drift evidence. No retained QA draft, operational dataset, binding, cross-owner identity, runtime resource, SQL, MotherDuck mutation, or Dive remains.

## Authority and status

Use the repository documents in this order:

1. `AGENTS.md` defines repository operating rules
2. This handoff defines verified commits, validation, production state, and the immediate restart gate
3. `MULTI_DATASET_DELIVERY_PLAN.md` defines product scope, phase order, and exit criteria

The delivery plan's final `Current next gate` now records Phase 2C-C assessment and separates repository-only work from live runtime access. Do not reopen Phase 2C-A or repeat Phase 2C-B implementation or production QA unless read-only verification proves drift.

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

## Remaining release-evidence gate

Do not repeat the migration or authenticated production smoke. Obtain read-only Vercel function logs covering deployment `dpl_ZLkeovEMWfd1HbsTcL34ta44bTqc`, the migration interval, and the 2026-08-04 owner smoke. Confirm there is no unresolved missing-table, activation, lifecycle, authorization, or server-render error attributable to Phase 2C-B.

The local Vercel CLI and `.vercel` project link were absent. GitHub proved the exact successful deployment and production URL, but the Vercel dashboard URL required an access path unavailable to the agent, and the existing runtime OIDC identity returned HTTP 403 from the read-only deployment API. Do not link the checkout, pull environment variables, or install another access mechanism merely to satisfy this evidence item without an explicit operating decision.

When that log interval is clean, record Phase 2C-B as **Released** without rerunning completed work. If it contains an attributable error, diagnose that exact interval before Phase 2C-C.

## Next implementation phase: Phase 2C-C

Phase 2C-C binds the public World Health Organization (WHO) air-quality fixture through one disposable, read-only MotherDuck runtime. Repository-only contract, policy, and deterministic test work may proceed without credentials. Live schema reconciliation and binding begin only after the remaining Phase 2C-B log evidence is captured and the exact resource boundary is approved separately.

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

Creating a MotherDuck user, token, share, database object, Data Definition Language (DDL) object, or runtime binding requires separate explicit approval.

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
| Phase 2C-B | Production-deployed, migrated, and owner-smoked; release-log interval pending | Operational registration persists owner-scoped evidence while runtime binding remains separate |
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
