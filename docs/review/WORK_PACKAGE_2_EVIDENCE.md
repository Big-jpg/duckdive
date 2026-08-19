# Work package 2 repository-structure evidence

This record captures the Work package 2 candidate prepared on 19 August 2026. It records completed structural checks and leaves the full Codespace validation gate open.

## Outcome

The repository now presents DuckDive and its active WA vehicle-market experiment without deleting retained engineering history. Gate 2 remains open until an approved Codespace passes the full Gate 1 baseline against this candidate.

No source acquisition, credential access, deployment, cloud mutation, or external-state verification occurred.

## Reduce tracked guidance

The candidate removes 302 generic skill files from Git tracking. Their nine source entries and computed hashes remain in `skills-lock.json`, and `.gitignore` excludes local installations.

Five files remain tracked beneath `.agents/skills/vic-house-platform-operator`. They preserve the repository-specific production, data-contract, and operations guidance required by `AGENTS.md`.

## Remove the one-off operator

The candidate removes `.codex-refresh-data-observatory.ts`. A repository-wide search found no runtime import, test, package script, or operator document that invokes it. The authoritative plan is the only remaining reference, where it records the intended removal.

## Align names and classifications

The private package is now named `duckdive`. The lockfile does not store the root package name, so the rename requires no lockfile rewrite.

The README and `docs/REPOSITORY_MAP.md` use these classifications:

- WA used-vehicle listings: current preserved experiment
- VIC detached-house sales: historical experiment
- Power BI and Fabric semantic-model import: tested prototype
- World Health Organization operational runtime: fixture adapter

`VIC_HOUSING_DATASET` remains exported for historical contract and reusable-infrastructure tests. `DATASETS` intentionally excludes it because its live share, starter ownership, and deployment state were not reverified. The active registry contains only `WA_VEHICLE_MARKET_DATASET`.

## Map repository surfaces

`docs/REPOSITORY_MAP.md` documents every tracked top-level directory: `.agents`, `db`, `docs`, `fixtures`, `public`, `rea-data-modelling`, `rea-sold-scraper`, `scripts`, `src`, and `workflows`.

The root README now contains the credential-free reviewer baseline, bounded-system summary, active dataset, state classifications, and review-document index. `docs/PLATFORM_OPERATIONS.md` preserves credentialed and historical operational detail outside that path.

## Local checks

The work laptop completed the checks it supports:

| Check | Result | Evidence |
| --- | --- | --- |
| Tracked skill boundary | Pass | Five repository-specific files remain; 302 generic files are removed from tracking |
| Lockfile coverage | Pass | All nine removed skill packages remain in `skills-lock.json` |
| Removed-file references | Pass | No runtime import, test, package script, or operator command references the deleted script |
| Top-level directory map | Pass | Every tracked directory has a matching `docs/REPOSITORY_MAP.md` entry |
| Acquisition gates | Pass | Example values remain false and the focused fail-closed suite passes |
| Focused tests | Pass | Four suites and 20 tests cover registry, acquisition, Fabric candidate, and WHO runtime policies |
| Focused lint | Pass | The tracked application surface reports no ESLint errors or warnings when ignored local generic-skill copies are excluded |
| Documentation review | Pass | New headings use sentence case; no banned filler, em dash, or untagged code block was introduced |
| `git diff --check` | Pass | No whitespace errors |

## Required Codespace validation

Use Node.js 22 and pnpm 10.28.0. Run these commands sequentially after pulling the candidate:

```bash
corepack pnpm install --frozen-lockfile
rm -rf -- .next
corepack pnpm exec next typegen
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm vehicle:replay -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
git diff --check
git status --short
```

The final status command must produce no output. Keep Gate 2 open if any command fails or changes the tracked working tree.
