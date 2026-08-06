# Next session handoff

Updated: 2026-08-06 (Australia/Perth)

## Start here

- Work on `main` from its current successor to `bca8686`.
- Start from the next owner-visible product outcome. There is no active phased delivery plan.
- The local CSV product slice and UI baseline are not deployed. Reverify production before making release claims.

## Product state

DuckDive currently has:

- `/` redirecting directly to the authenticated `/workspace` product
- the production VIC Housing workspace with governed Dives, editing, versions, reset, revert, embeds, and unlisted sharing
- an authenticated `/datasets/csv` slice that reads one CSV of up to 1 MiB only after explicit selection and derives an owner-scoped local Dive with profiling, a bounded chart, row preview, SHA-256 provenance, refresh restoration, replacement, and confirmed deletion
- browser-local semantic-model inspection with private reviewed evidence
- owner-scoped operational dataset registration
- a shared design-token baseline across the product UI

The CSV slice stores only its derived profile and bounded preview in owner-scoped `sessionStorage`. It fails closed across owner scopes and clears local CSV Dives on sign-out. It does not upload or durably ingest the CSV, create a MotherDuck table, or create an Embedded Dive.

One bounded MotherDuck probe Flight created on 2026-08-06 remains an external resource. It is disconnected from the repository and application runtime. Do not rerun, modify, schedule, or delete it without explicit approval.

Historical phase records, smoke details, and retired design alternatives remain available in Git history. Do not reconstruct them into the active plan unless they answer a current question.

## Current direction

The next release gate is an authenticated owner walkthrough of `/datasets/csv`: import a representative CSV, inspect the derived chart/profile/table, refresh and confirm restoration, replace it, delete it, sign out and confirm cleanup, then sign in as another owner and confirm the first owner’s result is unavailable.

For subsequent work:

1. State the exact owner-visible result.
2. Inspect the smallest reusable seams.
3. Build the end-to-end behavior.
4. Test the result and its obvious denial or failure case.
5. Generalize only after the result is useful.

Durable CSV ingestion, MotherDuck publication, and Embedded Dive generation are separate product and operational decisions, not implied next steps.

## Hard boundaries

- Never expose Neon, MotherDuck, authentication, email, AI-provider, or embed credentials to the browser, repository, logs, or chat.
- Preserve authenticated owner and workspace isolation. Unknown or cross-owner access must fail closed.
- Keep the VIC estate isolated from unrelated datasets and workloads.
- Reviewed semantic evidence is not automatically executable authority.
- Ask before production deployment, external resource creation, credential changes, MotherDuck mutations, destructive data changes, or retained production test data.
- Treat migrations already applied in production as additive history.

## Working style

- Prefer focused tests while iterating and full validation for release-affecting changes.
- Do not confuse a passing build or Vercel `Ready` state with a verified production release.
- Keep this handoff short and current. Replace stale direction instead of appending chronology.

For production operations, credentials, Neon, MotherDuck, ingestion, deployment, or incident response, read `.agents/skills/vic-house-platform-operator/SKILL.md` before acting.
