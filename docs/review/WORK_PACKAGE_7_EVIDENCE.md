# Work package 7: external review readiness evidence

**Status:** Candidate pending clean Linux CI and owner review

**Prepared:** 19 August 2026

## Implemented reviewer surface

- Reframed `README.md` around the contract-first bounded-agent thesis, a responsibility-based architecture diagram, a 90-second walkthrough, the Price Frontier discovery, explicit agent limits, an evidence map, credential-free commands, and unavailable-live-state boundaries.
- Added `SECURITY.md`, `CONTRIBUTING.md`, and `docs/PROVENANCE.md` without changing the repository's no-license status.
- Added a single continuous-integration badge and `.github/workflows/ci.yml` for the full credential-free baseline.
- Added an environment-free `review:replay` command for the two-row sanitized vehicle fixture.
- Added automated Markdown-link, tracked-file safety, repository-map, public-claim, provenance, and CI-content verification.
- Removed the obsolete report-validation bypass description from `.env.example`; the production configuration path was removed in Work package 6.

## CI baseline

The workflow uses Node.js 22 and pnpm 10.28.0 with a frozen lockfile. It runs, sequentially:

1. Tests.
2. Lint.
3. Type checking.
4. Production build.
5. Sanitized fixture replay.
6. Price Frontier reconstruction.
7. Bounded-agent architecture verification.
8. Case-study verification.
9. Asset-manifest verification.
10. Markdown-link verification.
11. Tracked-file safety scanning.
12. Public-review readiness verification.
13. A final tracked-diff check.

The workflow requests read-only repository contents permission and does not load secrets, `.env.local`, deployment credentials, or external data services.

## Local evidence

| Check | Result |
| --- | --- |
| Test suite | Passed: 57 files, 205 tests. |
| Lint | Passed with zero errors; 17 warnings came from ignored locally installed generic skills that are not present in a clean clone. |
| Type checking | Passed. |
| Production build | Passed; 19 static pages generated. The local build observed the owner's ignored `.env.local`, so clean-environment build evidence is deferred to CI. |
| Sanitized replay | Passed: 2 source rows, 2 unique listings, no duplicates or scope violations, 1 expected/fetched page, `COMPLETE`. |
| Price Frontier verification | Passed: 12 scenarios, 71 matching evaluation rows, 9 frontier survivors; in-memory DuckDB external access disabled and no credentials loaded. |
| Architecture verification | Passed: 8 mapped arrows, 11 scenarios, no production validation bypass. |
| Case-study and asset verification | Passed: 9 dated derivatives, 51 unique source hashes, no PNG metadata. |
| Markdown links | Passed: 123 local targets across 28 Markdown files. |
| Tracked-file safety | Passed: 313 files, no high-confidence secret or private-path pattern. |
| Review readiness | Passed: 11 mapped top-level directories, required public narrative, provenance, and CI baseline. |
| `git diff --check` | Passed. |

The work laptop's group policy blocks pnpm's `tsx` child-process runner. Local TypeScript entry points were therefore executed through the equivalent direct Node CLI. Exact pnpm command evidence must come from the clean Linux workflow or Codespace.

## Pending gate evidence

Do not close Gate 7 or the final acceptance gate until all of the following are supplied:

- The pushed GitHub Actions run passes on the candidate commit.
- A clean Linux checkout or Codespace completes the documented credential-free commands and ends with empty `git status --short` output.
- The owner completes final narrative and visual review of the README, case study, and nine public derivatives.

No deployment, acquisition, credential change, external resource creation, live MotherDuck operation, or data mutation is part of this gate.
