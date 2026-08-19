# Work package 4 case-study record

This record closes Work package 4 on 19 August 2026. The Price Frontier investigation is now the repository’s primary conceptual case study and remains independent of live MotherDuck access.

## Published case study

[`Trace a Ranger question to a market-wide frontier`](../case-studies/price-mileage-frontier.md) follows the required sequence:

1. Conventional price-and-odometer report
2. Corporate Memphis presentation change
3. Version 12 make-and-model parameters
4. Version 13 cohort-relative candidate rule
5. Version 14 odometer context without value estimation
6. Version 15 bounded first-pass triage
7. Version 16 strict price-mileage frontier
8. Control changes across vehicle populations
9. All/All as a market-wide union of local frontiers
10. Contract definitions, caveats, and refusal boundaries

The root README links the case study as the primary reviewer artifact.

## Evidence correction

The Phase 4 audit found that asset 07 did not include the observed version 16 change panel. The corrected derivative now combines three observed frames: the report, the validation panel, and row details whose crop starts at asking price.

The revised panel exposes the saved version and three checks: no price-mileage exchange rate, strict both-cheaper-and-lower-mileage removal, and a reason for every survivor. The asset manifest records the additional source hash and updated derivative hash. The published set remains nine files, and all derivatives remain free of ancillary Portable Network Graphics metadata.

## Numerical and semantic audit

The case study labels every screenshot as an 11 August 2026 artifact. Its only explicit market-wide values are the observed All/All count, median asking price, and median odometer from that date. It omits the later-observation listing count.

The case study distinguishes:

- Display scope: selected make/model, make/All, or All/All
- Candidate rule: below the listing’s own cohort 25th-percentile asking price, with at least 10 current priced listings
- Dominance scope: same make and model within plus or minus two manufacturer years

It uses strict inequalities for both asking price and odometer. Equal price or equal odometer cannot dominate. A survivor has no cheaper peer, no lower-mileage peer, or separate cheaper and lower-mileage peers.

The case study introduces no score, exchange rate, predicted value, transaction claim, or purchase advice. It identifies fair-value estimation, purchase selection, and sale inference as unsupported requests.

## Artifact boundaries

The case study states four evidence classes:

- Observed screenshots and conversation transcript
- Editorial composites of observed screenshot fragments
- A reference reconstruction specified for Work package 5 but not yet implemented
- Unavailable original version 16 source, complete prompt history, generated query or report source, and live MotherDuck access

No analytical result is presented as reconstructed in this phase.

## Validation results

| Check | Result | Evidence |
| --- | --- | --- |
| `corepack pnpm review:assets` | Pass | Nine derivatives, 51 unique source hashes, and no PNG metadata |
| `corepack pnpm review:case-study` | Pass | Nine images, dated claims, required scope semantics, and local links |
| Focused ESLint | Pass | Both review scripts report no findings |
| Node.js syntax checks | Pass | Both review scripts parse successfully |
| Writing review | Pass | Sentence-case headings, tagged code, no banned filler, and no punctuation anti-patterns |
| `git diff --check` | Pass | No whitespace errors |

No source acquisition, deployment, credential access, cloud mutation, or external-state verification occurred.
