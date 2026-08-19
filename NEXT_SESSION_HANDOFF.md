# Next session handoff

Updated: 2026-08-19 (Australia/Perth)

## Current outcome

The repository has moved from temporary WA vehicle-market operation into an approved engineering-review cleanup. The authoritative execution plan is [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md). Read it before changing code, data, documentation, screenshots, or repository structure.

This handoff supersedes the 17 August disposal-first instruction. The owner has explicitly changed the retention authority: do not fully flatten or delete the WA data. No destructive cleanup is authorized by the review plan.

Work package 1 is complete. Gate 1 establishes the retention authority, public path portability, license status, artifact inventory, safety scans, acquisition boundary, and reproducible validation baseline. No external system changed, no screenshot entered Git, and no deployment occurred.

Work package 2 is complete. It removes reproducible generic skills from Git tracking, removes the one-off production operator script, renames the private package to `duckdive`, classifies retained experiments, maps every tracked top-level directory, and moves operator detail out of the README. The full Codespace validation passed. See [`docs/review/WORK_PACKAGE_2_EVIDENCE.md`](docs/review/WORK_PACKAGE_2_EVIDENCE.md).

Work package 3 is complete. Nine review-safe Price Frontier derivatives now preserve the observed progression, version panels, four-state generalization test, and contract boundaries. A content-free manifest records every source and derivative hash. The original 52-file source set remains outside Git. See [`docs/review/WORK_PACKAGE_3_EVIDENCE.md`](docs/review/WORK_PACKAGE_3_EVIDENCE.md).

Work package 4 is complete. The primary conceptual case study now traces the observed report from a conventional scatterplot through versions 12 to 16, generalization, All/All scope, strict dominance, and the final contract boundaries. It separates observed artifacts, editorial composites, the subsequent reference reconstruction, and unavailable source evidence. See [`docs/case-studies/price-mileage-frontier.md`](docs/case-studies/price-mileage-frontier.md) and [`docs/review/WORK_PACKAGE_4_EVIDENCE.md`](docs/review/WORK_PACKAGE_4_EVIDENCE.md).

Work package 5 has an implementation candidate. It adds governed-view SQL, a wholly synthetic fixture, and an independent TypeScript implementation. `pnpm review:verify` runs both implementations against every fixture row in an in-memory DuckDB database, then checks the named strictness, scope, minimum-cohort, null, and display-union cases. Direct execution with Node 22 type stripping passed all 12 scenarios and matched 71 SQL and TypeScript evaluation rows with 9 survivors. The work laptop's application-control policy blocks the pnpm-launched TypeScript runner, so Gate 5 remains open pending the exact command after a frozen install in the Linux Codespace. Do not begin Work package 6 until that evidence is recorded.

## Review objective

Present DuckDive as an engineering case study in bounded agentic business intelligence. The central evidence is no longer a generic vehicle dashboard. A short conversation evolved a Ford Ranger question into a reusable price-mileage frontier that generalised across make, model, make-wide, and All/All display states while retaining local cohort semantics.

The public argument must remain precise:

- DuckDive constrains data inspection and report mutation through contracts, governed views, ownership, version checks, and a single verified save
- The price-mileage analysis preserves dollars and kilometres as independent measures
- Candidate eligibility is cohort-relative and requires at least 10 current priced listings
- Dominance is strict: another legitimate peer must be both cheaper and lower-mileage
- Asking prices are not transactions, valuations, or purchase recommendations
- Semantic request classification remains agent-mediated and must not be described as a formal guarantee

## Evidence established during planning

The user supplied a conversation transcript and a screenshot set outside Git. The set contains 52 files and 51 unique images; one duplicate pair is byte-identical.

The screenshots establish this progression:

1. Conventional price-versus-mileage analysis
2. Corporate Memphis restyling
3. Version 12 make/model parameterisation
4. Version 13 cohort-relative low-price candidates
5. Version 14 mileage-aware investigation
6. Version 15 bounded first-pass triage
7. Version 16 unweighted price-mileage frontier
8. Generalisation across Hyundai Getz, Land Rover, Chevrolet, Range Rover Evoque, and All/All states
9. Contract and validation panels that preserve refusal boundaries

The All/All frame shows 14,747 listings, a $28,988 median asking price, and an 88,138 km median odometer. These values match the 11 August observation. Keep the case-study artifact pinned to that observation and do not mix it with the 17 August snapshot of 14,737 listings.

The screenshots show the critical scope separation:

- **Display scope**: selected make/model, make/All, or All/All
- **Candidate rule**: below the listing's own cohort 25th-percentile asking price, with at least 10 priced listings
- **Dominance scope**: same make/model within plus or minus two manufacturer years

Original screenshots remain private evidence inputs. The nine published derivatives remove source listing IDs, strip metadata, preserve relevant analytical labels, and record source and derivative hashes. Do not commit the full source set.

## Current repository truth

- Branch `main` matched `origin/main` at commit `a9228d6` before the Work package 1 edits
- The working tree contained no tracked raw WA evidence; `.env.local` was ignored
- Only five skill files remain tracked, all within the repository-specific platform operator
- Nine generic skills remain reproducible from `skills-lock.json` and are ignored when installed locally
- The README, private package, product, and active registry now identify DuckDive and the WA vehicle-market experiment consistently
- The repository has no GitHub Actions workflows
- `docs/REPOSITORY_MAP.md` classifies WA vehicles as current, VIC housing as historical, Fabric import as a tested prototype, and the WHO runtime as a fixture adapter
- The preserved repository contains cohort percentile machinery but not the original version 16 Dive source
- The approved Codespace clean install resolves every declared dependency
- All 57 test suites and 198 tests pass
- Lint, type checking, production build, sanitized fixture replay, and `git diff --check` pass
- The Codespace working tree remains clean after validation

The previous 17 August handoff remains historical evidence in Git history. Its live MotherDuck, Embedded Dives, deployment, and report-version claims are not current telemetry.

## External-state boundaries

- The MotherDuck Business trial has ended, so Embedded Dives cannot be treated as a review surface
- Do not claim that MotherDuck databases, shares, Dives, Blob objects, or Neon rows were reverified during this cleanup
- Do not run another vehicle acquisition
- Do not enable either vehicle-market source gate
- Do not deploy, mutate MotherDuck, alter credentials, create resources, or delete external data without new explicit approval
- Keep the reviewer path credential-free and independent of live services

## Next authorized work

Execute [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md) in order. Each work package has an exit gate. Do not begin a dependent package or call a package complete until its gate passes and its evidence is recorded.

Finish the authorized Work package 5 gate in the Linux Codespace. Run a frozen install, `pnpm review:verify`, type checking, focused lint or full lint, and the repository test suite sequentially, then confirm that validation leaves the working tree clean. If the SQL/TypeScript comparison fails, fix it through a forward commit; do not weaken or remove the comparison. Work package 6 is not yet authorized.
