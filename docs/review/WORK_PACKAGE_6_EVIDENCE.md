# Work package 6: bounded-agent architecture evidence

**Status:** Complete  
**Closed:** 19 August 2026  
**Implementation commit:** `9eac3dd` (`Harden bounded agent control loop`)

## Outcome

Work package 6 makes the repository's bounded-agent claims inspectable and testable. The report workflow now has one enforced production policy path, explicit capability boundaries, bounded preparation and tool-attempt budgets, and documentation that separates deterministic enforcement from model-mediated judgment.

No production deployment, credential change, external resource creation, destructive data operation, or live MotherDuck mutation was performed in this work package.

## Enforcement changes

- Removed the production `DUCKDIVE_REPORT_VALIDATION_ENABLED` bypass from report generation, chat routing, tool execution, and preflight checks.
- Added the `report-presentation` capability to the VIC and WA workspace policies.
- Enforced at most one preparation attempt, one inspection attempt, and one mutation attempt per run.
- Added explicit version-conflict handling for stale mutation requests.
- Preserved deterministic authorization, validation, and execution boundaries around model-selected actions.

## Inspectable architecture

- [`docs/architecture.md`](../architecture.md) maps the deployed components, external dependencies, trust boundaries, and eight architecture arrows to implementation evidence.
- [`docs/agent-control-loop.md`](../agent-control-loop.md) documents the bounded control loop, attempt budgets, deterministic guards, model-mediated decisions, and failure behaviour.
- `scripts/verify-bounded-agent-docs.mjs` checks the eight mapped arrows, all required scenarios, and the absence of a production validation bypass.
- Prototype and unavailable-service boundaries are stated explicitly; the repository does not claim that the expired MotherDuck Business environment or a live MotherDuck runtime was verified.

## Required control-loop scenarios

The automated test suite covers all eleven required cases:

1. Successful bounded inspection.
2. Successful report preparation and presentation.
3. Unauthorized capability rejection.
4. Cross-workspace isolation.
5. Invalid tool argument rejection.
6. Preparation budget exhaustion.
7. Inspection budget exhaustion.
8. Mutation budget exhaustion.
9. Stale-version mutation conflict.
10. Report-policy validation failure.
11. Safe failure without leaking sensitive configuration.

## Codespace validation

The owner pulled implementation commit `9eac3dd` into a clean GitHub Codespace and supplied the following evidence.

| Check | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | Passed; lockfile was current. Node 24 emitted the expected engine warning. |
| `corepack pnpm review:architecture` | Passed: 8 mapped arrows, 11 required scenarios, no production validation bypass. |
| `corepack pnpm test` | Passed under Node 24.14.0: 57 test files, 205 tests. |
| `corepack pnpm lint` | Passed under Node 24.14.0 and again under Node 22.23.2. |
| `corepack pnpm typecheck` | Passed under Node 22.23.2. |
| `corepack pnpm build` | Passed under Node 22.23.2; 19 static pages generated. |
| `corepack pnpm review:verify` | Passed: 12 synthetic scenarios, 71 matching evaluation rows, 9 frontier survivors. |
| `git status --short` | No output after validation; the Codespace worktree was clean. |

The build detected the owner's existing `.env.local`; no values were recorded and no deployment or external platform mutation was performed. Live MotherDuck access remains unavailable because the Business Plan trial has ended, so this evidence verifies the repository and synthetic reference reconstruction rather than a live MotherDuck runtime.

## Gate decision

Gate 6 is closed. Every architecture arrow is mapped, trust boundaries and external dependencies are documented, deterministic guards are distinguished from agent judgment, the production policy bypass is absent, all required scenarios pass, and prototype limitations remain explicit.
