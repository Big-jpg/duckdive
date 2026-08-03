# Next session handoff

Last verified: 2026-08-03 (Australia/Perth)

Phase 2C-B is complete at its local and disposable-database boundary. Git contains the implementation and rehearsal through `36ffc64`, but production deployment and migration 016 remain unverified. Re-establish production truth, close the Phase 2C-B release gate only with owner approval, then treat Phase 2C-C as the next implementation phase.

## Restart point

- **Repository**: `C:\Users\rossf\Desktop\vic-house-data-lab`
- **Branch**: `main`
- **Verified commit**: `36ffc64` (`Record Phase 2C-B database rehearsal`)
- **Git state**: `main`, `origin/main`, `origin/HEAD`, and `codex/phase-2cb-operational-registry` pointed to `36ffc64` on 2026-08-03
- **Current phase**: Phase 2C-B is complete, merged, and pushed
- **Production state**: unverified for the Phase 2C-B code and migration 016
- **Next implementation phase**: Phase 2C-C, after the production-state audit and any approved Phase 2C-B release closure

Do not infer a release from the Git push. This checkpoint records no Phase 2C-B Vercel deployment ID, release-log interval, or production migration 016 evidence.

## Authority and status

Use the repository documents in this order:

1. `AGENTS.md` defines repository operating rules
2. This handoff defines verified commits, validation, production state, and the immediate restart gate
3. `MULTI_DATASET_DELIVERY_PLAN.md` defines product scope, phase order, and exit criteria

The delivery plan's final `Current next gate` section still names Phase 2C-A. That statement predates commits `3fb54ad`, `d0d08f5`, and `36ffc64`. Do not reopen Phase 2C-A or Phase 2C-B unless read-only verification proves drift.

Status terms follow the delivery plan:

- **Released**: committed, deployed, migrated where required, and owner-verified
- **Complete**: implemented and validated at the phase's declared boundary
- **Current**: approved direction and next implementation target
- **Candidate**: retained intent that still needs a product or operating decision
- **Deferred**: outside the active delivery sequence

## Phase 2C-B completion evidence

Phase 2C-B adds a workspace-owned operational registry without connecting a runtime resource or creating a Dive.

The implementation commit is `d0d08f5`. Commit `36ffc64` records the disposable-database rehearsal and is the current Git reference point.

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
- No production migration, credential change, MotherDuck mutation, runtime binding, or Dive occurred

The agent left the disposable Neon branch intact. Treat branch cleanup as an owner action if it still exists.

## Immediate ordered gate

Complete these steps in order. Read-only inspection does not authorize production mutation.

1. Inspect the current Vercel production deployment, source commit, status, aliases, and relevant release-log interval
2. Inspect `ops.schema_migration` for migration 016 without printing connection details
3. Compare the observed code and schema state with the cases below
4. Request explicit approval before applying migration 016, changing deployment state, creating runtime resources, or writing production smoke data

Handle the observed state as follows:

- **Code and migration present**: gather release evidence, then run the approved authenticated Phase 2C-B smoke
- **Code present and migration absent**: stop authenticated dataset-registry use; request approval to apply migration 016 through `DATABASE_URL_UNPOOLED`, rerun the migration command to prove it skips, and inspect the ledger
- **Code absent and migration absent**: preserve migration-before-dependent-code ordering for any approved release
- **Migration present and code absent**: confirm the additive schema is inert for the deployed application, then follow the approved deployment sequence

Do not call Phase 2C-B released until code, schema, release logs, authenticated behavior, denial paths, and cleanup are evidenced.

### Phase 2C-B production smoke

If the owner authorizes release closure, verify:

1. The static VIC dataset remains ready
2. One reviewed synthetic draft can be previewed and registered
3. Repeating registration preserves the same dataset ID and key
4. Static and relational datasets list together
5. Cross-owner reads and writes fail closed
6. Deleting the activated draft returns 409
7. The unbound dataset can be archived
8. Audit events contain no contract content or credentials
9. No runtime binding, MotherDuck resource, SQL, or Dive was created
10. Disposable production rows are removed unless the owner elects to retain them

## Next implementation phase: Phase 2C-C

Phase 2C-C binds the public World Health Organization (WHO) air-quality fixture through one disposable, read-only MotherDuck runtime. It begins only after Phase 2C-B is operationally safe.

### Scope

- Keep browser traffic behind the Next.js backend
- Store a non-secret resource reference separately from the reviewed semantic contract
- Use a dedicated workload or service-account boundary for application access
- Allowlist tables, dimensions, measures, filters, and result limits
- Compare the reviewed contract with live columns before marking the dataset ready
- Keep unrelated `fabric_audit_analytics`, Fabric engagement, and VIC resources out of scope
- Defer read scaling until measured concurrency requires it

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
| Phase 2C-B | Complete and pushed; production unverified | Operational registration persists owner-scoped evidence while runtime binding remains separate |
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
