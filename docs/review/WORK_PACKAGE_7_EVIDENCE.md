# Work package 7: external review readiness evidence

**Status:** Complete

**Closed:** 19 August 2026

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

## Clean Linux evidence

GitHub Actions run **Prepare DuckDive for external review #1** executed from the push of candidate commit `5802daf` to `main` and completed successfully in 1 minute 1 second. Its credential-free reviewer-baseline job passed in 56 seconds. Because the workflow begins with a repository checkout and frozen install on `ubuntu-latest`, the run supplies the clean Linux checkout and exact pnpm-command evidence that the Windows work laptop could not produce.

The successful run emitted one deprecation warning because `actions/checkout@v4`, `actions/setup-node@v4`, and `pnpm/action-setup@v4` still declared the Node.js 20 action runtime and GitHub forced them onto Node.js 24. The closure change upgrades those action wrappers to `actions/checkout@v7`, `actions/setup-node@v7`, and `pnpm/action-setup@v6`. It also makes a clean `git status --porcelain` an explicit CI condition and adds a readiness regression check for the Node.js 24 action-runtime majors. The application remains tested on the repository-declared Node.js 22 runtime.

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

The work laptop's group policy blocks pnpm's `tsx` child-process runner. Local TypeScript entry points were therefore executed through the equivalent direct Node CLI. The successful clean Linux workflow supplies the exact pnpm evidence.

## Owner review and gate decision

The owner reviewed the public narrative and nine curated derivatives, supplied the successful CI result, and approved cleanup and gate closure. Gate 7 and the final acceptance gate are closed.

## External-state accounting

The candidate push activated the repository's pre-existing Vercel Git integration and reported a successful Vercel check. The assistant did not invoke, configure, approve, or interact with that deployment. The owner was notified before closure and approved closing the gate. This automatic result is not used as repository evidence and does not change the documented unavailable-live-state boundary.

No acquisition, credential change, external resource creation, live MotherDuck operation, or data mutation was performed as part of this gate.
