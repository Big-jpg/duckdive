# Next session handoff

Updated: 2026-08-19 (Australia/Perth)

## Current outcome

The repository has moved from temporary WA vehicle-market operation into an approved engineering-review cleanup. The authoritative execution plan is [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md). Read it before changing code, data, documentation, screenshots, or repository structure.

This handoff supersedes the 17 August disposal-first instruction. The owner has explicitly changed the retention authority: do not fully flatten or delete the WA data. No destructive cleanup is authorized by the review plan.

The current task completed only the planning handoff. It did not implement the cleanup, alter external systems, copy screenshots into Git, or deploy anything.

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

- Branch `main` matched `origin/main` before the two planning-document edits
- The working tree contained no tracked raw WA evidence; `.env.local` was ignored
- The repository tracks 578 files, including 307 files beneath `.agents`
- Only five tracked skill files belong to the repository-specific platform operator; the other generic skills are reproducible from `skills-lock.json`
- The README still presents a VIC housing application with three Dives, while the registered dataset is WA vehicle listings with four starters
- The repository contains two documentation files and no GitHub Actions workflows
- The latest commit is named `intentionally left blank` and adds the one-off `.codex-refresh-data-observatory.ts` operator script
- The preserved repository contains cohort percentile machinery but not the original version 16 Dive source
- Current local validation runs 56 of 57 suites and 191 tests; `semantic-model-archive.test.ts` cannot resolve `jszip` from the installed dependency tree even though the manifest and lockfile declare it

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

Start with Work package 1: truth, retention, and reproducibility. Preserve unrelated user changes. Use forward commits only. Do not rewrite public history.
