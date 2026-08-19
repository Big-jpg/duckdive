# Work package 5 reference-reconstruction record

This record closes Work package 5 on 19 August 2026. Reviewers can now execute the documented Price Frontier method without MotherDuck credentials, the original version 16 source, or historical vehicle data.

## Published reconstruction

The reconstruction has three inspectable parts:

- [`db/case-studies/price-mileage-frontier.sql`](../../db/case-studies/price-mileage-frontier.sql) evaluates governed current-listing fields before any display filter is applied
- [`fixtures/case-studies/price-mileage-frontier.json`](../../fixtures/case-studies/price-mileage-frontier.json) defines wholly synthetic cohorts and expected edge cases
- [`scripts/verify-price-frontier.ts`](../../scripts/verify-price-frontier.ts) independently implements the rule in TypeScript, executes the SQL in an in-memory DuckDB database, and compares every evaluation row

`pnpm review:verify` is the credential-free reviewer interface. The DuckDB instance disables external access and extension auto-install. The verifier does not load `.env.local`, make a network request, create a persistent database, or mutate an external system.

## Semantics exercised

The SQL and TypeScript implementations both require a non-null advertised asking price and odometer for two-dimensional evaluation. They form price cohorts from current priced listings of the same make and model within plus or minus two manufacturer years, withhold the percentile rule below 10 priced listings, and require asking price to be strictly below the continuous 25th percentile.

Eligible candidates are removed only when one comparable peer has both a strictly lower asking price and a strictly lower odometer. Candidate and dominance evaluation precede make/model display filtering. Survivors expose cohort size, cohort 25th percentile, price gap, cheaper-peer count, lower-mileage-peer count, and one of three survival reasons.

The 12 synthetic scenarios cover:

1. Strict two-measure domination
2. Equal asking price
3. Equal odometer
4. Separate cheaper and lower-mileage peers
5. A different model
6. A same-model peer outside the year window
7. A cohort of nine priced listings
8. A null asking price
9. A null odometer
10. A cross-model strictly lower listing
11. Make/All display union
12. All/All display union

The reconstruction introduces no weighting, score, predicted value, transaction inference, exchange rate, or purchase recommendation.

## Codespace validation

The owner validated commit `143a09d` in the Linux Codespace. The environment reported Node.js 24.14.0 and pnpm 10.28.0. Because `package.json` declares Node.js 22.x, pnpm emitted an unsupported-engine warning; it did not prevent installation or any validation command from passing. The repository's declared review baseline remains Node.js 22.x.

| Check | Result | Evidence |
| --- | --- | --- |
| `corepack pnpm install --frozen-lockfile` | Pass | Lockfile was current; DuckDB Node API 1.5.5-r.4 and the Linux binding installed |
| `corepack pnpm review:verify` | Pass | 12 scenarios; 71 SQL/TypeScript evaluation rows agreed; 9 frontier survivors |
| `corepack pnpm typecheck` | Pass | TypeScript reported no errors |
| `corepack pnpm lint` | Pass | ESLint reported no findings |
| `corepack pnpm test` | Pass | 57 test files and 198 tests passed |
| `git status --short` | Pass | No output after validation |

The verifier output identified the artifact as a reference reconstruction and confirmed that it used an in-memory database with external access disabled and no `.env.local`.

No source acquisition, deployment, credential access, MotherDuck operation, cloud mutation, or historical-result reconstruction occurred.
