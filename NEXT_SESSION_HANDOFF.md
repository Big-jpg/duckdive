# Next session handoff

Updated: 2026-08-05 (Australia/Perth)

## Start here

- Work on `main` from commit `bab28df` or its current successor.
- The owner completed a quick production smoke on 2026-08-05 and reported the application healthy.
- Start from first principles and the next user-visible outcome. There is no active phased delivery plan.
- Build quickly with focused validation. Do not make schema generalization or abstraction proof a prerequisite unless the requested feature needs it.

## Product state

DuckDive currently has:

- the production VIC Housing experience, authenticated workspaces, governed Dives, editing, versions, reset, revert, embeds, and unlisted sharing
- browser-local semantic-model inspection with private reviewed evidence
- owner-scoped operational dataset registration
- the released WHO runtime experiment and its additive migrations

The WHO work proved that a second dataset can be reconciled, queried through a bounded server route, isolated from VIC, revoked, and cleaned up. It does not define the required architecture for the next feature. No WHO runtime binding or quality-assurance fixture is retained.

Historical phase records, smoke details, and design alternatives remain available in Git history. Do not reconstruct them into the active plan unless they answer a current question.

## Current direction

For the next feature:

1. State the exact owner-visible result.
2. Inspect the existing seams that could deliver it.
3. Build the smallest end-to-end path.
4. Test the behavior and its obvious denial or failure case.
5. Generalize only after the result is useful.

The current schema and runtime code may be reused, simplified, bypassed, or replaced. Do not continue the old Phase 2C sequence by default. WA Housing, Fabric, WHO, and aviation are options only when the owner chooses one for a concrete outcome.

## Hard boundaries

- Never expose Neon, MotherDuck, authentication, email, AI-provider, or embed credentials to the browser, repository, logs, or chat.
- Preserve authenticated owner and workspace isolation. Unknown or cross-owner access must fail closed.
- Keep the VIC estate isolated from unrelated datasets and workloads.
- Reviewed semantic evidence is not automatically executable authority.
- Ask before production deployment, external resource creation, credential changes, MotherDuck mutations, destructive data changes, or retained production test data.
- Treat migrations already applied in production as additive history; do not roll them back merely because a new design does not use them.

## Working style

- Prefer a focused test, typecheck, or browser walkthrough while iterating.
- Run broad build, reconciliation, live smoke, and cleanup checks when the change or release risk warrants them.
- Do not confuse a passing build or Vercel `Ready` state with a verified production release.
- Keep this handoff short and current. Replace stale direction instead of appending chronology.

For production operations, credentials, Neon, MotherDuck, ingestion, deployment, or incident response, read `.agents/skills/vic-house-platform-operator/SKILL.md` before acting.
