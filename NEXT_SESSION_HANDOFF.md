# Next session handoff

Updated: 2026-08-11 (Australia/Perth)

## Start here

- Work on `codex/wa-vehicle-market` unless the branch has since been merged.
- Treat `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` as the source/data authority.
- Use `.agents/skills/vic-house-platform-operator/SKILL.md` before credential, Neon, Blob, MotherDuck, Dive, deployment, or cleanup work.
- Reverify external state before mutation.

## Verified external state

- Existing Vercel project: `vic-house-data-lab` in the existing `big-team`.
- Production URL: `https://duckdive.gold`.
- Production branch: `main`.
- Verified production commit: `e10181b623e299f7dc550eeafe0dfd3c727cdc10`.
- Git was reconnected after an unnecessary temporary disconnection.
- No WA Vercel branch deployment was retained.
- Do not create a second Vercel project/team, Neon project, Blob store, MotherDuck organization, auth estate, or human seat.

## Product and retention decision

The WA dataset is a temporary private lens for existing vetted users, not a public product. Private fixture replay, a bounded live smoke, and a private full observation are approved based on the stated usage. Public sharing is unnecessary and remains disabled. Vehicle-market data must not persist beyond 2026-08-18 Australia/Perth; use `docs/WA_VEHICLE_MARKET_RETENTION.md` for explicit disposal and verification.

## Existing-infrastructure boundary

Reuse the current Vercel project/domain, Neon control plane and Auth, private Blob store, MotherDuck organization, allowlist, workspaces, Dives, editing, embeds, and release operations. Add only:

- additive Neon migration 019 and temporary operational rows;
- the dedicated private Blob prefix `vehicle-market/source=autotrader/market=wa-used/`;
- the `wa_vehicle_market` managed DuckLake/database and restricted share inside the existing MotherDuck organization;
- WA dataset selectors and starter Dives on the WA branch.

Reuse the current DuckDive service-account convention where permissions satisfy the governed share. Do not create a new identity merely for naming symmetry.

## Implemented local state

- canonical gated adapter, strict filter grammar, sequential pagination/retry, raw persistence before parse, shared replay, exact reconciliation, dated fixtures, deterministic dimensional model, and first/adjacent-run claim rules;
- private Blob fixture seeding through `vehicle:seed-blob`;
- managed DuckLake initialization through `vehicle:ducklake:init -- --execute`;
- executable raw-lineage-verifying staging and publication through `vehicle:publish -- --run <run-id> --execute --record-neon`;
- WA preflight no longer requires the unrelated dormant WHO service-account identity;
- explicit 2026-08-18 disposal runbook.

## Next release boundary

1. Pass focused and full local validation without source or cloud access.
2. Push the completed branch and allow the existing Vercel project to create a fresh preview.
3. Reverify that every credential and URL resolves to the existing approved DuckDive resources before mutation.
4. Apply migration 019 to the existing Neon project after explicit approval.
5. Seed and replay the sanitized fixture through the existing private Blob store without source access.
6. Initialize `wa_vehicle_market` and apply DuckLake DDL after explicit MotherDuck approval.
7. Run the bounded source smoke with source gate true and full gate false.
8. Reconcile before invoking the separately gated full collection.
9. Publish only a `COMPLETE` run and perform authenticated owner plus denial smokes.

## Hard boundaries

- Do not mutate or delete existing VIC analytical data merely to enable the WA lens.
- Do not enable source gates in Vercel application configuration.
- Do not compare through non-`COMPLETE` runs and never infer sale.
- Keep descriptions and feature strings out of the observation fact; keep the physical feature bridge deferred.
- Never expose Neon, Blob, MotherDuck, authentication, email, AI-provider, or embed credentials.
- External mutations and final disposal require explicit approval and exact-target verification.
