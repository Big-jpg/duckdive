---
meta:
  contentType: Conceptual
  title: Deliver the DuckDive multi-dataset platform
  navLabel: Multi-Dataset Delivery Plan
  category: Planning
---

# Deliver the DuckDive multi-dataset platform

This plan records the original multi-dataset intent, reconciles it with the released system, and defines the next delivery sequence. It preserves VIC Housing as the production fixture while DuckDive gains reviewed semantic evidence, operational dataset registration, isolated runtime bindings, and governed Dives.

## Plan record

This page is the directional authority for multi-dataset delivery. `NEXT_SESSION_HANDOFF.md` remains the authority for verified commits, migrations, deployments, smoke tests, and current production state.

- **Goal**: deliver one data-agnostic path from reviewed semantic evidence to a governed operational Dive
- **Audience**: product owner, implementation agents, and production operators
- **Recovered source**: the user-supplied “DuckDive Multi-Dataset Platform: Sequenced Delivery Plan” received on 2026-08-03
- **Content plan**: reconcile the recovered phases, state changed decisions, define the current sequence, and preserve later dataset requirements
- **Open questions**: approve the smallest code-only Phase 2C-D recipe/context slice; later approve any governed Dive mutation and select the first real external dataset and its workload boundary

## Authority and status rules

Use these rules when the plan and implementation differ:

1. Verified release evidence in `NEXT_SESSION_HANDOFF.md` wins over an older planning assumption.
2. This file defines the intended next phase after the verified checkpoint.
3. A completed phase is not reopened unless a read-only check proves drift.
4. A proposed phase authorizes design work only. Schema changes, deployments, credentials, MotherDuck writes, and source ingestion require their own release approval.
5. VIC Housing remains a fixture for the general platform. VIC-specific behavior must not become the product contract.

Status terms have fixed meanings:

- **Released**: committed, deployed, migrated where required, and owner-verified
- **Complete**: implemented and validated at the phase's declared boundary
- **Current**: approved direction and next implementation target
- **Candidate**: retained intent that still needs a product or operating decision
- **Deferred**: outside the active delivery sequence
- **Superseded**: replaced by a safer or more general released design

## Intended outcome

DuckDive becomes an allowlisted, question-led platform for governed datasets:

- VIC Housing remains the protected production baseline
- You can review a semantic model without uploading its raw archive or connectivity details
- An owner can activate reviewed evidence through an explicit operational binding
- The backend resolves dataset identity, contract, query policy, and runtime resources
- Each unrelated customer or workload receives a structural MotherDuck boundary
- Trusted recipes and question-led Dives use the same ownership, agent, version, embed, and sharing systems
- Historical and near-real-time datasets pass separate ingestion and freshness gates

The browser never receives Neon credentials, MotherDuck service tokens, raw connection details, or unrestricted query access.

## Reconcile the recovered plan with the released system

The recovered plan was coherent, but it was never stored as repository authority. Delivery followed its early safety sequence, then changed the product path.

| Recovered phase | Current state | Reconciliation |
|---|---|---|
| Phase 0: production baseline | Complete | The VIC baseline, owner edit lifecycle, MotherDuck smoke, deployment, and isolation gates passed. The proposed feature flags were not added. |
| Phase 1: dataset abstraction | Released as Phase 1A and Phase 1B | `src/lib/datasets.ts` and `app.workspace_dive` now resolve dataset context and relational ownership. The released schema does not yet include question origin, archive status, or an internal Dive identifier distinct from the MotherDuck Dive ID. |
| Phase 2: question-led VIC | Released as Phase 2A with a changed interaction | The homepage is question-led, examples are lazy, and the editor receives a server-derived manifest. The released flow requires an explicit trusted starter and manual **Apply**. It does not provision a fresh Question Canvas or submit automatically. |
| Unplanned Phase 2B: semantic evidence | Released | Browser-local Azure DevOps semantic-model review now stores a private `ReviewedSemanticContractV1`. It does not connect data or register a runtime dataset. |
| Phase 3: WA Housing | Candidate | No WA estate, ingestion, publication, registry entry, or Dive has been implemented in this checkout. WA remains a candidate for the first real external historical dataset. |
| Phase 4: Perth Airspace shadow ingestion | Candidate | No aviation ingestion or infrastructure has been implemented. Licensing, API quota, scheduler capability, and retention policy require current verification. |
| Phase 5: aviation Dives | Candidate | This phase depends on the aviation shadow-ingestion gate and remains inactive. |
| Phase 6: integrated hardening | Partly continuous, final gate not reached | Existing releases applied strong per-phase validation. Cross-dataset production hardening awaits an operational second dataset. |

The recovered estimate was 21 to 34 engineering days across four to seven weeks. That estimate no longer describes the remaining work. It included completed phases, excluded Phase 2B, and assumed WA and aviation would follow immediately. Estimate the remaining delivery after Phase 2C-A identifies the adapter and the owner selects the first real dataset.

## Record the decisions that changed

The following changes are intentional and now form part of the product contract.

### Keep explicit review before agent mutation

The recovered Phase 2 plan treated **Build a Dive** as approval to provision and submit automatically. Phase 2A instead stores a local draft, requires an explicit starter, and waits for manual **Apply**.

Keep the released behavior until evidence shows that automatic submission reduces total work without weakening control. Do not restore auto-submit as part of dataset onboarding.

The broader recovered homepage remains incomplete. DuckDive does not yet expose a multi-dataset selector, health and freshness cards, question-origin Dives, archiving, or the proposed ten-Dive active limit. Add those surfaces only after an operational second dataset makes them useful.

### Keep semantic evidence separate from execution

Phase 2B introduced a boundary that the recovered plan did not anticipate. A reviewed semantic contract describes entities, measures, relationships, grain, caveats, and selected Data Analysis Expressions (DAX). It does not authorize a Fabric connection, a MotherDuck database, an ingestion job, or a Dive.

Activation must add runtime information through a separate owner-approved record. It must not add connectivity fields to `ReviewedSemanticContractV1`.

### Do not make WA the automatic next dataset

The recovered plan named WA Housing as the second dataset. The current product direction first needs to prove that reviewed evidence can become an operational dataset without hard-coding another fixture.

WA remains the leading historical candidate because its baseline requirements are already defined. It enters delivery only after the activation boundary passes and the owner confirms WA as the first real dataset.

### Do not make Perth Airspace the automatic third dataset

The aviation plan contains useful ingestion, quality, quota, retention, and soak requirements. Its source and operating assumptions can drift. Reverify licensing, pricing, quota reset behavior, scheduler support, and public-use rights before implementation.

### Add flags only where rollback needs them

The recovered plan proposed five flags before abstraction work. The released phases shipped safely without them. Do not add retrospective flags around completed behavior.

Add a server-side exposure flag only when a new operational dataset or near-real-time capability needs independent rollback. Database ownership and policy checks remain authoritative when a flag is off.

## Follow the updated delivery sequence

The sequence below starts from the released Phase 2B checkpoint.

### Phase 2C: activate reviewed evidence

**Status**: Current

**Objective**: prove one controlled path from a private reviewed contract to a workspace-owned operational dataset without connecting a real customer source.

#### Phase 2C-A: preview activation

**Status**: Complete and pushed

Build a code-only activation preview:

- Compile an owner-scoped `ReviewedSemanticContractV1` into a deterministic operational candidate
- Derive a safe public contract from selected entities, measures, relationships, grain, and diagnostics
- Preserve the reviewed contract fingerprint and source provenance
- Mark DAX as semantic evidence, not executable DuckDB Structured Query Language (SQL)
- Reject connectivity fields, raw model content, unsupported identifiers, and inconsistent fingerprints
- Show the candidate in `/datasets/new` without persisting activation state
- Use a synthetic semantic model that matches the public `sample_data.who.ambient_air_quality` table as the disposable fixture

This slice makes no database migration, MotherDuck mutation, runtime registration, or Dive.

Exit when:

- The compiler is deterministic and covered by privacy tests
- Owner and cross-owner route tests fail closed
- The preview identifies unsupported semantic features explicitly
- The UI preserves the Phase 2B browser-local archive boundary
- Tests, lint, TypeScript, build, and visual verification pass

#### Phase 2C-B: register a workspace dataset

**Status**: Released under owner-approved fresh-smoke evidence substitution

Add an owner-scoped operational registry after Phase 2C-A passes:

- Store a stable dataset identifier and workspace owner
- Link immutably to the reviewed draft and contract fingerprint
- Store lifecycle state such as `reviewed`, `binding`, `ready`, `degraded`, and `archived`
- Store the safe public contract and contract version
- Keep runtime bindings in a separate table
- Record activation and lifecycle audit events without contract content or credentials
- Enforce idempotent activation for the same workspace and contract fingerprint

Do not relax the static VIC registry to accept incomplete dynamic entries. Resolve static fixtures and relational operational datasets through one server-owned interface.

Exit when:

- Migration reruns are idempotent
- Same-owner activation is idempotent
- Cross-workspace reads and writes fail closed
- Deleting a Phase 2B draft cannot orphan or silently alter an activated dataset
- No secret or connection value is stored in the semantic contract

#### Phase 2C-C: bind one disposable runtime

**Status**: Released at `58c70b4`; Vercel Production `dpl_AgbS8NzH2TnFBpk4PWJ1cNBePxwK`

Bind the WHO air-quality fixture through a read-only MotherDuck resource:

- Keep browser traffic behind the Next.js backend
- Store a non-secret resource reference separately from the semantic contract
- Use a dedicated workload or service-account boundary for application access
- Allowlist tables, dimensions, measures, filters, and result limits
- Compare the reviewed contract with live columns before marking the dataset ready
- Keep unrelated `fabric_audit_analytics`, Fabric engagement, and VIC resources out of scope
- Defer read scaling until measured concurrency requires it

Any MotherDuck user, token, share, database, or Data Definition Language (DDL) change needs explicit production approval.

Commence Phase 2C-C in four reviewable gates:

1. **Repository contract and policy — small**: define the binding shape, adapter interface, structured query request, allowlists, result ceiling, and lifecycle rules. Validate these with injected metadata and query fixtures; do not require credentials or a live resource.
2. **Read-only reconciliation — medium**: inspect only `sample_data.who.ambient_air_quality` through the approved disposable identity, compare live columns with the reviewed contract, and persist only a reconciliation outcome and non-secret resource reference. Do not copy the public fixture or create a database object merely to obtain isolation.
3. **Bounded query routing — medium**: route a typed request by owner and dataset through the backend, compile only allowlisted identifiers and operators, reject arbitrary SQL and multi-statement input, and enforce a server-owned row limit.
4. **Binding and revocation rehearsal — medium**: create the disposable binding, prove WHO-only access and VIC denial, revoke it, and prove that VIC remains healthy. This gate requires explicit approval for the identity, token, and binding mutations before it runs.

The owner approved the dedicated `duckdive_who_phase2cc` identity, 15-minute read-scaling tokens, the public WHO reference, targeted production-schema rehearsal, exact production route smoke, and exact cleanup boundary. The released route smoke proved owner activation, exact reconciliation, bounded query, route-enforced WHO resource selection, VIC-field and other denial paths, revocation, and post-revocation unavailability. Deployment-filtered Vercel logs attributed the sequence. Console Level counts in the fresh 30-minute window were Warning 0, Error 0, and Fatal 0; expected 4xx denials remained visible as request-status rows. Exact Neon cleanup removed the draft, operational dataset, and binding, retained content-free audits, and preserved the VIC baseline. No Dive, share, database object, copied fixture, or retained binding was created.

Exit when:

- Contract-to-column reconciliation passes exactly or records an acknowledged variance
- Unknown tables and columns fail closed
- Queries are read-only, single-statement, bounded, and dataset-routed server-side
- No VIC row or resource can be reached from the fixture context
- Revoking the binding makes the fixture unavailable without affecting VIC

#### Phase 2C-D: provision one governed Dive

Add one trusted recipe after the runtime binding passes:

- Define a dataset-specific starter through the existing provisioning seam
- Create relational workspace-Dive ownership
- Supply only the active dataset contract to DuckDive
- Verify versions, source hashes, embeds, reset, revert, and audit data
- Keep public sharing disabled unless the dataset policy explicitly enables it

Do not generate a general TypeScript XML (TSX) renderer or a parallel chat system. Reuse the existing MotherDuck Dive and DuckDive runtime.

Exit when:

- The starter renders against the fixture without query errors
- Agent inspection cannot reach VIC or unrelated databases
- One deterministic edit and restoration pass
- Dataset and contract versions appear in run and audit records
- Opening the homepage creates no embed session

#### Phase 2C-E: release the activation boundary

Release Phase 2C only after the code, schema, runtime, and owner gates pass in order:

1. Commit and push the approved implementation
2. Apply additive migrations before code requires new tables, or deploy compatible code first
3. Reconcile operational datasets and workspace-Dive ownership
4. Deploy to Vercel production
5. Inspect the release log interval
6. Complete authenticated activation, query, edit, reset, and revocation smoke tests
7. Confirm the final database contains no disposable fixture rows unless the owner elects to retain them

### Phase 3: onboard the first real external dataset

**Status**: Candidate

**Objective**: prove the activation design against owner-controlled data and a dedicated workload boundary.

Select one option before implementation:

- **WA Housing**: use the recovered immutable baseline and historical ingestion requirements
- **Reviewed Fabric model**: bind an owner-selected semantic contract through an approved Fabric-to-MotherDuck or direct governed adapter
- **Another small dataset**: choose it only when it tests a missing platform seam better than WA or Fabric

Prefer WA when the goal is ingestion and publication parity with VIC. Prefer a reviewed Fabric model when the goal is proving the Phase 2B evidence path. Do not implement both in one phase.

The recovered WA source archive is available locally at `rea_sales_data_model/WA`. It remains deferred until Phase 3 is selected, and its planning assertions must be reprofiled before implementation.

The selected dataset needs:

- Explicit source ownership and usage rights
- A per-customer or per-workload database and service-account boundary
- Immutable lineage and reproducible publication where ingestion applies
- A versioned semantic and public contract
- Dataset-specific query, editing, freshness, and sharing policies
- One trusted starter before additional recipes
- Cross-dataset denial tests against VIC and every unrelated resource

### Phase 4: add near-real-time ingestion capability

**Status**: Candidate

**Objective**: validate bounded micro-batch ingestion before any near-real-time dataset appears in the catalog.

Perth Airspace remains the nominated fixture if current licensing and service terms permit it. Retain the recovered requirements:

- Five-minute scheduled polling around Perth Airport
- Immutable payload hashes and terminal poll outcomes
- Append-only normalized observations with explicit quality classifications
- Idempotent MotherDuck publication
- Quota enforcement below the provider limit
- Private raw payload storage
- Separate retention for raw, normalized, aggregate, and health data
- Exclusion of protected identities and person-specific tracking
- A 48-hour shadow soak before catalog exposure

Recalculate expected slots, success thresholds, quota ceilings, and freshness targets from the current provider and scheduler contracts before coding.

### Phase 5: expose one near-real-time dataset

**Status**: Candidate

**Objective**: expose the proven feed through the same dataset, question, contract, and Dive boundaries.

Enable a near-real-time dataset only when:

- The shadow soak passes
- Freshness and degraded status appear in both public and agent contracts
- The agent can query governed views only
- Public sharing is denied in the server policy
- Unsupported historical and tracking requests produce refusal or clarification
- Reset, revert, archive, and failure paths pass on desktop and mobile

### Phase 6: harden the integrated platform

**Status**: Candidate

**Objective**: prove that multiple operational datasets behave as one governed product.

The final gate includes:

- Full automated validation and production build
- Per-dataset reconciliation and freshness checks
- Cross-dataset and cross-workspace denial tests
- Versioned contracts for every enabled dataset
- Owner activation, question, edit, reset, revert, archive, and revocation smokes
- Dataset-aware operational telemetry without secrets or raw source payloads
- Independent rollback of each new dataset exposure
- Removal of compatibility paths only after one stable production cycle

## Preserve the original WA requirements

If WA Housing becomes Phase 3, restore these recovered baseline assertions before implementation:

- 358 immutable source files
- 347,902 source rows
- 347,886 unique observations
- 16 duplicate observations retained and explained
- 61,736 observations without parsed price
- Seven `1901-12-14` and nine `1970-01-01` sentinel dates retained in lineage and excluded from analytical publication
- An isolated Neon project, `wa_house_data` MotherDuck database, restricted share, and dedicated service identity

Treat these values as recovered planning assertions, not current telemetry. Reprofile the actual source archive before approving the phase.

## Preserve the original aviation requirements

If Perth Airspace becomes Phase 4, carry forward these safeguards:

- Record scheduled, request, source, ingestion, and publication timestamps separately
- Record response status, payload hash, aircraft counts, normalized counts, quota headers, and terminal failure codes
- Prevent overlapping polls and duplicate publication
- Reconcile committed unpublished batches before another upstream request
- Retain invalid or absent positions with a quality classification
- Keep `seen`, `seen_pos`, and ingestion time distinct
- Dry-run retention and report exact counts before enabling deletion
- Attribute source failures before changing application code

The recovered 10,000-call entitlement, 9,000-call ceiling, RapidAPI endpoint, and Vercel schedule are assumptions. Verify them against current contracts.

## Apply the definition of done

Every active phase must pass the relevant conditions below.

### Correctness and isolation

- Tests, lint, TypeScript, and production build pass
- Migrations, ingestion, activation, and provisioning are idempotent
- Dataset and workspace boundaries fail closed
- No unexplained reconciliation difference remains

### Data and semantic quality

- Every source unit has lineage, checksum, and terminal state when ingestion applies
- Exclusions are classified and counted
- Runtime columns reconcile with the reviewed contract
- DAX remains evidence until an approved execution layer implements and tests equivalent semantics
- Freshness, retention, quality, and caveats appear in the applicable contract

### Agent governance

- The backend selects the database and runtime binding
- Queries remain allowlisted, bounded, and read-only
- DuckDive receives only the active dataset contract
- Saves are reported only after version, hash, and embed verification
- Unsupported requests clarify or refuse without mutation

### Product behavior

- The homepage explains the selected dataset and its evidence
- Questions remain out of URLs
- A question never starts an agent run without explicit user action
- Examples remain secondary and create embeds lazily
- Failures preserve user work and provide a retry path
- Desktop, mobile, keyboard, generated artifacts, and error states receive explicit validation

### Operations

- New dataset exposure can be disabled without destructive rollback
- Telemetry distinguishes source, ingestion, publication, query, embed, and agent failures
- Quota and retention rules are enforced in code when applicable
- Vercel `Ready` remains a build signal, not a release-completion signal
- Production completion includes authenticated owner verification and cleanup evidence

## Keep later expansion deferred

The following work remains outside the active sequence:

- External application programming interface (API) or Model Context Protocol (MCP) credentials for third-party agents
- General autonomous Dive generation without trusted recipes and verified mutation
- Shared-table `tenant_id` isolation for unrelated customers
- Public sharing for datasets without an explicit sharing policy
- Configurable aviation regions or true push streaming
- Commercial aviation use without written source rights
- Combining VIC and WA into one physical estate
- Replacing the production TypeScript pipeline with Fabric notebooks

## Current next gate

Phase 2C-C is Released. Commits `766e9fe` and `58c70b4` are pushed on `main`; Vercel Production deployment `dpl_AgbS8NzH2TnFBpk4PWJ1cNBePxwK` is Ready and current. Exact live reconciliation, bounded WHO queries, resource, SQL, VIC-field, anonymous, post-revocation, and rebind denials, degraded failure handling, revocation, content-free audits, production migrations 017 and 018, fresh attributable logs, baseline protection, and exact zero-row cleanup passed.

The next reviewable slice is a code-only Phase 2C-D recipe/context seam using the released provisioning path. It may define the WHO starter and dataset-scoped context, but it must not create a Dive, share, database object, token policy, new MotherDuck identity, retained binding, token, embed session, migration, deployment, Vercel configuration, or external API call. Require a separate explicit owner gate before any external mutation. Do not connect Fabric, ingest WA, or begin aviation work in this slice.
