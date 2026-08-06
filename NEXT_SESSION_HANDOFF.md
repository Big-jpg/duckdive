# Next session handoff

Updated: 2026-08-05 (Australia/Perth)

## Start here

- Work on `main` from commit `bab28df` or its current successor.
- The owner completed a quick production smoke on 2026-08-05 and reported the application healthy. The new frontend journey is local-only and has not been deployed.
- Start from first principles and the next user-visible outcome. There is no active phased delivery plan.
- Build quickly with focused validation. Do not make schema generalization or abstraction proof a prerequisite unless the requested feature needs it.

## Product state

DuckDive currently has:

- a public teaching narrative and authenticated browser-local Lake → Flights → Dives journey
- a representative Duck Lake that accepts file metadata without reading or uploading file contents
- the production VIC Housing experience, authenticated workspaces, governed Dives, editing, versions, reset, revert, embeds, and unlisted sharing
- browser-local semantic-model inspection with private reviewed evidence
- owner-scoped operational dataset registration
- the released WHO runtime experiment and its additive migrations

The WHO work proved that a second dataset can be reconciled, queried through a bounded server route, isolated from VIC, revoked, and cleaned up. It does not define the required architecture for the next feature. No WHO runtime binding or quality-assurance fixture is retained.

The current route entry points are `/` for the public narrative, `/lake`, `/flights`, and `/dives` for the teaching journey, and `/workspace` for the unchanged VIC experience. Lake state is versioned session metadata only; it clears on sign-out or tab close and never calls the VIC ingestion route. Flights now teaches the current MotherDuck contract: a versioned Python entrypoint, optional runtime configuration, an asynchronous run lifecycle, and table outputs for Dives. It does not represent Duckling count as a Flight setting; Ducklings are isolated compute assigned to users or service accounts, not dynamically added workers inside one Flight run.

MotherDuck now contains one deliberately bounded probe Flight, `duckdive-flight-01` (`9daad437-aad5-4b67-a1b2-3d5745878fa5`). It is active, on-demand only, version 1, uses pinned `duckdb==1.5.5`, the default Flights token, no config or secrets, and a 120-second timeout. Run 1 succeeded on 2026-08-06 with exit code 0; its untruncated logs prove the Collect → Shape → Deliver lifecycle and report zero writes. The probe created no database or table and is not connected to the application runtime. Do not schedule, modify, rerun, or delete it without explicit approval.

Historical phase records, smoke details, and design alternatives remain available in Git history. Do not reconstruct them into the active plan unless they answer a current question.

## Current direction

For the next feature:

1. State the exact owner-visible result.
2. Inspect the existing seams that could deliver it.
3. Build the smallest end-to-end path.
4. Test the behavior and its obvious denial or failure case.
5. Generalize only after the result is useful.

The next release gate is an authenticated owner walkthrough of file selection, cross-page state continuity, refresh restoration, reset/sign-out cleanup, and the `/workspace` handoff. Keep visual iteration simple and presentation-led.

The current schema and runtime code may be reused, simplified, bypassed, or replaced. Do not continue the old Phase 2C sequence by default. WA Housing, Fabric, WHO, and aviation are options only when the owner chooses one for a concrete outcome.

## Hard boundaries

- Never expose Neon, MotherDuck, authentication, email, AI-provider, or embed credentials to the browser, repository, logs, or chat.
- Preserve authenticated owner and workspace isolation. Unknown or cross-owner access must fail closed.
- Keep the VIC estate isolated from unrelated datasets and workloads.
- Reviewed semantic evidence is not automatically executable authority.
- Browser-local Lake files must not be read, uploaded, or represented as durably ingested.
- Ask before production deployment, external resource creation, credential changes, MotherDuck mutations, destructive data changes, or retained production test data.
- Treat migrations already applied in production as additive history; do not roll them back merely because a new design does not use them.

## Working style

- Prefer a focused test, typecheck, or browser walkthrough while iterating.
- Run broad build, reconciliation, live smoke, and cleanup checks when the change or release risk warrants them.
- Do not confuse a passing build or Vercel `Ready` state with a verified production release.
- Keep this handoff short and current. Replace stale direction instead of appending chronology.

For production operations, credentials, Neon, MotherDuck, ingestion, deployment, or incident response, read `.agents/skills/vic-house-platform-operator/SKILL.md` before acting.
