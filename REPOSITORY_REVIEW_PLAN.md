# Prepare DuckDive for engineering review

Status: authoritative execution plan  
Updated: 2026-08-19 (Australia/Perth)  
Document type: execution plan  
Audience: MotherDuck reviewers, software engineers, analytics engineers, data analysts, and the repository owner

## Purpose and authority

This plan controls the repository cleanup that prepares DuckDive for external engineering review. `NEXT_SESSION_HANDOFF.md` provides session orientation; this document defines execution order, evidence requirements, and completion gates.

The repository should present DuckDive as a case study in bounded agentic business intelligence. DuckDive began as a safe way to demonstrate agentic analytics using public data. The experiment suggests that some analytical applications can place semantics in explicit data contracts, governed analytical views, quality policy, report policy, and bounded agent tools instead of maintaining a separate runtime business-intelligence semantic model.

Semantics have not disappeared. The design distributes them across code and data responsibilities that a reviewer can inspect.

## Owner decisions

These decisions apply throughout execution:

- Do not fully flatten or delete the retained WA vehicle-market data
- Do not run another acquisition
- Treat the MotherDuck Business trial and Embedded Dives as ended and unavailable for review
- Do not deploy or mutate external systems as part of repository cleanup
- Build a credential-free, fixture-based reviewer path
- Use the supplied conversation and screenshots as historical evidence
- Publish only curated, redacted screenshot derivatives
- Preserve Git history and use forward commits
- Do not add an open-source licence until source-data and third-party obligations are reviewed
- Defer any repository rename until documentation and verification are stable

External deployment, resource creation, credential changes, MotherDuck data definition language, share changes, and destructive data operations require separate explicit approval. This plan does not authorize them.

## Case-study thesis

The primary case study is not that an agent found inexpensive vehicles. A concrete Ford Ranger shopping question evolved through conversation into a reusable analytical operator:

> For any selected display population, identify listings with an asking price below their own governed cohort's 25th percentile, then retain a listing only when no legitimate peer is both strictly cheaper and strictly lower-mileage.

The operator preserves three separate scopes:

| Scope | Definition | Required behavior |
| --- | --- | --- |
| Display scope | Selected make/model, make/All, or All/All | Controls titles, key performance indicators, distributions, and visible frontier rows |
| Candidate rule | Listing below its own cohort 25th-percentile asking price | Requires a non-null asking price and at least 10 current priced cohort listings |
| Dominance scope | Same make/model within plus or minus two manufacturer years | Uses non-null asking price and odometer and removes only strict two-measure domination |

The All/All report unions local cohort results into a global discovery surface. It does not compare a low-cost hatchback directly with a high-cost late-model vehicle. Comparability semantics perform the normalization while dollars and kilometres remain unweighted.

The screenshots pin the observed artifact to the 2026-08-11 observation:

| Measure | Observed value |
| --- | ---: |
| Current listings | 14,747 |
| Priced sample | 14,747 |
| Median asking price | $28,988 |
| Median odometer | 88,138 km |

Do not combine those figures with the 2026-08-17 observation of 14,737 listings, $28,990 median asking price, and 88,170 km median odometer.

## Evidence classes

Every public claim must use one of these labels:

- **Repository-proven**: executable code, tests, fixtures, migrations, or generated results in the repository support the claim
- **Observed historical artifact**: supplied screenshots or conversation text support the claim, but the original generated Dive source or live runtime is unavailable
- **Reference reconstruction**: new fixture, SQL, or TypeScript reproduces the documented method but is not represented as the original version 16 source
- **Prototype**: code exists and has focused tests, but the visible application does not expose a complete supported workflow
- **Unavailable live state**: the Business entitlement or external access needed for verification is no longer available

Do not upgrade an observed artifact or reconstruction into a repository-proven historical result without additional evidence.

## Work package 1: Resolve truth, retention, and reproducibility

This package replaces stale operational instructions and establishes a clean baseline before presentation work.

### Changes

- Update the WA retention document with the owner's 19 August decision and mark the disposal deadline as superseded
- Preserve the historical deadline and original authority as history, not a current instruction
- Remove public absolute user paths and the obsolete Windows Corepack path
- Inventory tracked data, ignored evidence directories, generated files, large files, and local-only operator artifacts
- Run secret and sensitive-path scans across the working tree and Git history without printing secret values
- Confirm that live acquisition gates fail closed and remain disabled
- Restore a clean dependency installation so `jszip` resolves and the semantic archive suite runs
- Record current test, lint, type-check, build, fixture-replay, and `git diff --check` baselines
- State that no licence is currently granted rather than selecting an open-source licence by assumption

### Gate 1: truthful and reproducible baseline

Do not begin structural cleanup until all conditions pass:

- [x] Retention documentation records the superseding owner decision
- [x] No current instruction requires disposal by 18 August
- [x] No source acquisition or external mutation occurred
- [x] No tracked secret, credential, private share URL, raw vehicle payload, or absolute user path remains
- [x] A clean install resolves every declared dependency
- [x] All 57 test suites run and pass
- [x] Lint, type checking, production build, fixture replay, and `git diff --check` pass
- [x] Validation leaves the working tree clean apart from the intended changes

## Work package 2: Reduce repository noise

This package makes the actual application and analytical evidence visible without rewriting history.

### Changes

- Remove the one-off `.codex-refresh-data-observatory.ts` production operator script
- Stop tracking generic skills that `skills-lock.json` can reproduce
- Retain `.agents/skills/vic-house-platform-operator` and its repository-specific contract
- Rename the private package from `rea-for-all` to `duckdive`
- Classify VIC housing, WA vehicles, Power BI/Fabric import, and WHO runtime code as current experiment, historical experiment, tested prototype, or fixture adapter
- Explain why `VIC_HOUSING_DATASET` exists but is not registered
- Keep live acquisition adapters disabled by default and outside the reviewer workflow
- Move operational detail out of the README and into task-specific reference documents
- Preserve Git history and make each cleanup change through a forward commit

### Gate 2: reviewer-oriented repository structure

- [x] Repository-specific agent guidance remains available
- [x] Generic vendored guidance no longer obscures application code
- [x] No runtime import, test, or documented command depends on a removed file
- [x] Every top-level directory has a documented purpose
- [x] Historical and prototype code is labelled accurately
- [x] Package, product, README, and registered-dataset naming no longer contradict each other
- [ ] Full validation from Gate 1 still passes

## Work package 3: Curate the screenshot evidence

This package turns the supplied visual record into review-safe evidence. The source set remains outside Git.

### Source-set facts

- 52 PNG files were supplied
- 51 unique SHA-256 hashes exist
- One duplicate pair is byte-identical
- Source PNG metadata contains only standard `dpi`, `gamma`, and `srgb` keys
- Several screenshots expose source listing IDs and must not be published unchanged

### Public derivative set

Create these assets beneath `docs/assets/price-frontier/`:

1. `01-conventional-scatterplot.png`
2. `02-corporate-memphis-restyle.png`
3. `03-parameterized-ford-ranger.png`
4. `04-cohort-relative-price-filter.png`
5. `05-mileage-aware-investigation.png`
6. `06-first-pass-shortlist.png`
7. `07-price-mileage-frontier.png`
8. `08-generalization-grid.png`
9. `09-contract-and-refusal-boundaries.png`

The generalization grid must show Hyundai Getz, Land Rover/All, All/All, and Range Rover Evoque states. The contract asset must show metric definitions, cohort rules, validation caveats, and prohibited claims.

### Asset rules

- Crop or mask source listing IDs and any capability identifiers
- Preserve make/model selectors, titles, cohort counts, thresholds, key performance indicators, frontier explanations, and validation wording
- Strip source metadata from derivatives
- Give every image descriptive alt text and a factual caption
- Record original filename, original SHA-256, derivative filename, derivative SHA-256, observation date, visible report version, redactions, and crop notes in a content-free manifest
- Do not commit the original 52-file source set
- Do not invent a missing prompt, query, report source, or result

### Gate 3: review-safe visual evidence

- [ ] The manifest accounts for every published derivative
- [ ] The duplicate source file is represented once
- [ ] Public images contain no source listing ID, credential, token, share URL, user identity, or local path
- [ ] Captions distinguish observed evidence from reconstruction
- [ ] The progression from ordinary dashboard to generalized frontier is readable without live application access
- [ ] Image-link and metadata checks pass

## Work package 4: Publish the primary case study

This package makes the conversational evolution the repository's main explanatory artifact.

### Document

Create `docs/case-studies/price-mileage-frontier.md` as a conceptual case study with this sequence:

1. Start with the conventional report
2. Use Corporate Memphis as the low-cost proof that natural language can change presentation
3. Scope the report to Ford Ranger while retaining make and model as independent parameters
4. Add the below-cohort-25th-percentile candidate rule
5. Add cohort-relative odometer context without estimating value
6. Reduce the review set without recommending a purchase
7. Replace ranking with the strict price-mileage frontier
8. Change controls to prove generalization across populations
9. Select All/All to expose the market-wide union of local frontiers
10. Reveal the Contract tab and refusal boundaries

### Required interpretation

- Describe versions 12 through 16 using the visible change and validation panels
- Explain why report scope differs from comparison scope
- Explain why comparability semantics normalize a heterogeneous market without transforming price or odometer into a score
- Explain why equal price or equal mileage does not dominate
- Explain the survival reason: no cheaper peer, no lower-mileage peer, or cheaper and lower-mileage alternatives are different listings
- State that the original version 16 Dive source is not preserved in the repository
- Label the historical screenshots as observed artifacts
- Link the reference reconstruction from Work package 5
- Include nearby rejected requests such as fair-value estimation, purchase recommendation, and sale inference

### Gate 4: case-study integrity

- [ ] Every numerical claim is tied to the 11 August observation or omitted
- [ ] No later-observation value is presented as part of the version 16 artifact
- [ ] The case study states what was observed, what was reconstructed, and what remains unavailable
- [ ] The frontier is never described as a valuation, bargain score, or recommendation engine
- [ ] A reviewer can explain display, candidate, and dominance scopes after one reading
- [ ] All case-study links and images resolve

## Work package 5: Add an executable reference reconstruction

This package lets a reviewer verify the analytical method without MotherDuck credentials or the original dataset.

### Public interfaces

Add:

- `db/case-studies/price-mileage-frontier.sql`
- `fixtures/case-studies/price-mileage-frontier.json`
- `scripts/verify-price-frontier.ts`
- `pnpm review:verify`

The reference SQL must derive candidates from governed current-listing fields and expose cohort size, cohort 25th percentile, price gap, cheaper-peer count, lower-mileage-peer count, and survival reason.

### Required semantics

- Require non-null advertised asking price and odometer
- Require at least 10 current priced listings in the price cohort
- Require advertised asking price to be strictly below the cohort 25th percentile
- Define comparables as the same make and model within plus or minus two manufacturer years
- Remove a candidate only when one comparable peer has both a strictly lower asking price and a strictly lower odometer
- Compute candidate and dominance semantics before applying make/model display filters
- Introduce no score, exchange rate, predicted value, or transaction claim

### Synthetic scenarios

- A strict dominator removes a candidate
- Equal asking price does not dominate
- Equal odometer does not dominate
- Separate cheaper and lower-mileage peers do not dominate
- A different model cannot dominate
- A same-model vehicle outside the year window cannot dominate
- A cohort below 10 withholds the candidate rule
- Make/All and All/All displays union local results without cross-model comparison
- Null price or odometer cannot enter a two-dimensional frontier

### Gate 5: credential-free reproducibility

- [ ] `pnpm review:verify` runs after a fresh install without `.env.local`
- [ ] The command performs no network request or external mutation
- [ ] Every synthetic scenario passes
- [ ] SQL and TypeScript reference behavior agree on the fixture
- [ ] The output identifies itself as a reference reconstruction
- [ ] The command leaves the working tree clean

## Work package 6: Document and harden the bounded-agent claim

This package aligns public claims with the enforcement that exists in code.

### Changes

- Create `docs/architecture.md` around data, contract, agent, and application/control responsibilities
- Create `docs/agent-control-loop.md` for interpret, inspect, revise, verify, record, reject, and fail states
- Map each responsibility and transition to implementation and test evidence
- Describe vendors as current implementations rather than the architecture
- Remove the production environment path that can disable report-policy validation
- Retain any validation bypass only as an internal unit-test seam
- Add an allowlisted presentation capability instead of bypassing report policy for styling changes
- Document that semantic classification remains model-mediated
- Distinguish deterministic enforcement from prompted behavior

### Required control-loop scenarios

- Safe analytical change is accepted
- Presentation-only change is accepted
- Unknown capability is rejected
- Failed validation prevents save
- Unsupported valuation request produces no save after classification
- Sale or sell-through request produces no save after classification
- Material ambiguity produces one clarification and no save
- Inspection accepts one read-only query and caps its result
- A stale version is rejected
- A second mutation is rejected
- Failed version or hash verification is never reported as success

### Gate 6: evidence-backed architecture claims

- [ ] Every architecture arrow maps to code or is labelled proposed
- [ ] Every trust boundary and external dependency is described
- [ ] Public text distinguishes deterministic guards from agent judgment
- [ ] Production report-policy validation cannot be disabled by configuration
- [ ] All required control-loop scenarios have passing tests
- [ ] No prototype is described as production-complete

## Work package 7: Reframe the repository and add public verification

This package completes the reviewer experience after the evidence and enforcement are stable.

### README

Rewrite the README as a landing page that contains:

- The contract-first agentic business-intelligence thesis
- One responsibility-based architecture diagram
- A 90-second reviewer walkthrough
- The price-mileage frontier progression
- What the agent can and cannot do
- An evidence-first repository map
- Credential-free validation commands
- Current entitlement and experimental boundaries

The README must not present DuckDive as a MotherDuck showcase, a generic AI dashboard generator, or only a VIC housing application.

### Public repository files

- Add `SECURITY.md`
- Add `CONTRIBUTING.md`
- Add source and third-party provenance documentation
- Add GitHub Actions for frozen install, tests, lint, type checking, production build, fixture replay, `review:verify`, secret scanning, documentation links, and asset-manifest validation
- Use a continuous-integration badge only
- Do not imply that production, Embedded Dives, or MotherDuck live state is available

### Gate 7: external review readiness

- [ ] A fresh clone completes the documented credential-free path
- [ ] Continuous integration reproduces the local validation baseline
- [ ] Every README link resolves
- [ ] Every top-level directory appears in the repository map
- [ ] The README lets a reviewer answer why DuckDive exists, what the experiment discovered, what constrains it, and where the evidence lives
- [ ] Security, contribution, provenance, retention, and licence status are explicit
- [ ] No badge or statement implies production readiness or live entitlement
- [ ] Validation leaves `git status` clean

## Final acceptance gate

Do not call the repository review-ready until every condition below passes:

- [ ] Gates 1 through 7 pass with recorded evidence
- [ ] The historical screenshot manifest and all public derivatives pass privacy review
- [ ] The reference reconstruction reproduces the documented frontier semantics offline
- [ ] All tests, lint, type checking, build, fixture replay, review verification, secret scan, link check, asset check, and `git diff --check` pass
- [ ] No raw vehicle data, unredacted listing ID, credential, private URL, local path, or employer-derived artifact is tracked
- [ ] No external system was mutated without separate approval
- [ ] The working tree is clean
- [ ] The owner completes final narrative and image review

## Execution order and change control

Implement the work as seven reviewable pull requests, one per work package. A package may add a prerequisite fix discovered during execution, but it must document the reason and remain within the package's authority.

If a gate cannot pass:

1. Record the failed condition and evidence
2. Stop dependent work
3. Prefer a truthful limitation over a fabricated artifact or weakened test
4. Request new authority before any external mutation, destructive action, licence decision, or scope expansion

Completion means the repository can defend its claims without relying on a live demo. It does not mean the historical production estate was reverified or restored.
