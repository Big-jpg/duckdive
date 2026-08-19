# Next session handoff

Updated: 2026-08-19 (Australia/Perth)

## Current outcome

The repository has moved from temporary WA vehicle-market operation into an approved engineering-review cleanup. The authoritative execution plan is [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md). Read it before changing code, data, documentation, screenshots, or repository structure.

This handoff supersedes the 17 August disposal-first instruction. The owner has explicitly changed the retention authority: do not fully flatten or delete the WA data. No destructive cleanup is authorized by the review plan.

Work package 1 is complete. Gate 1 establishes the retention authority, public path portability, license status, artifact inventory, safety scans, acquisition boundary, and reproducible validation baseline. No external system changed, no screenshot entered Git, and no deployment occurred.

Work package 2 has a review candidate. It removes reproducible generic skills from Git tracking, removes the one-off production operator script, renames the private package to `duckdive`, classifies retained experiments, maps every tracked top-level directory, and moves operator detail out of the README. Gate 2 remains open only for the full Codespace validation. See [`docs/review/WORK_PACKAGE_2_EVIDENCE.md`](docs/review/WORK_PACKAGE_2_EVIDENCE.md).

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

Original screenshots are evidence inputs, not ready-to-publish assets. Public derivatives must remove source listing IDs, strip metadata, preserve relevant analytical labels, and record source and derivative hashes. Do not commit the full source set.

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
- All 57 test suites and 195 tests pass
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

Finish Gate 2 in the approved Codespace. Do not begin Work package 3 until the frozen install, all 57 suites, lint, type checking, production build, fixture replay, diff check, and clean status pass. Preserve unrelated user changes, use forward commits, and do not rewrite public history.
