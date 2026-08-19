# Contributing to DuckDive

DuckDive is maintained as an inspectable engineering case study. Contributions should strengthen its evidence, contracts, bounded-control guarantees, or credential-free reviewer experience without implying that historical infrastructure is currently live.

## Before changing code

1. Read [`README.md`](README.md), [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md), and [`docs/REPOSITORY_MAP.md`](docs/REPOSITORY_MAP.md).
2. Classify the affected surface as current, historical, prototype, or fixture-only.
3. Use synthetic or sanitized fixtures. Do not add raw source data, private screenshots, listing identifiers, credentials, capability URLs, or local user paths.
4. Keep live acquisition and all external mutations out of the reviewer workflow.
5. Add focused tests for acceptance, refusal, stale-state, and safe-failure behavior when changing a control boundary.

## Local validation

Use Node.js 22 and pnpm 10.28.0:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm review:replay
corepack pnpm review:verify
corepack pnpm review:architecture
corepack pnpm review:case-study
corepack pnpm review:assets
corepack pnpm review:links
corepack pnpm review:security
corepack pnpm review:readiness
git diff --check
git status --short
```

Validation must leave the tracked worktree clean. Do not configure `.env.local` for the reviewer baseline.

## Documentation and evidence

- Label claims as repository-proven, observed historical artifact, reference reconstruction, prototype, or unavailable live state.
- Tie numerical historical claims to their observation date.
- Explain analytical grain, scope, null handling, minimum cohorts, and strictness explicitly.
- Give images factual captions and descriptive alt text; update the relevant content-free manifest.
- Record meaningful gate evidence without copying credentials or private command output.

## Pull-request expectations

Keep changes focused and explain what changed, why it matters, which boundary it affects, and which checks passed. Reviewers should be able to reproduce the result without external services.

Contributions do not change the repository's [no-license status](LICENSE_STATUS.md). Do not assume that submitting material grants reuse rights beyond separately agreed terms.
