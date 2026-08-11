# Next session handoff

Updated: 2026-08-11 (Australia/Perth)

## Start here

- Work on `codex/wa-vehicle-market` unless the branch has since been merged.
- Treat `C:\Users\rossf\Downloads\WA_Vehicle_Market_Validated_Codex_Handoff.md` as the source/data authority.
- Use `.agents/skills/vic-house-platform-operator/SKILL.md` before production, credential, Neon, Blob, MotherDuck, Dive, or deployment work.
- Reverify external state. No WA cloud resources, source requests, migration applications, Dives, deployments, or production mutations were made by this implementation session.

## Implemented local state

The branch contains the local, fail-closed WA Used Vehicle Listings foundation:

- canonical direct-HTTP adapter with `listing_created ASC`, fixed 50-row pages, strict parameter allowlisting, `_source ?? hit` unwrapping, and returned-row validation;
- separate source and full-population gates plus explicit CLI flags;
- immutable local and private-Blob raw-object stores, run manifests, shared replay, retained non-200 bodies, and explicit no-response attempts;
- dated source-behaviour fixtures and sanitized wrapped/unwrapped replay evidence;
- exact `COMPLETE`, `CHANGED_DURING_CAPTURE`, `PARTIAL`, and `INVALID` reconciliation;
- additive Neon migration `db/019_vehicle_market_ingestion.sql` and an operational persistence adapter;
- managed DuckLake DDL, staging/promotion SQL, governed views, deterministic analytical keys, idempotency checks, and adjacent-complete-run event denial rules;
- WA as the only active registry dataset, with Market Atlas, Vehicle Lens, and Data Observatory starter Dives;
- public sharing disabled in the dataset contract, API authorization, and editor UI.

The checked-in fixture replay reconciles to 2 source rows, 2 raw hits, 2 unique listing IDs, zero duplicates, zero scope violations, one expected/fetched page, and `COMPLETE`. The dated empirical fixture separately preserves the 2026-08-11 source evidence of 14,749 listings over 295 pages; those values are not production constants.

## Next release boundary

Before any WA cloud work:

1. Pin or detach the existing VIC Vercel deployment from automatic updates.
2. Confirm licensing/source permission and republication/public-sharing boundaries separately.
3. Obtain explicit approval to create the isolated WA Vercel, Neon, private Blob, managed DuckLake, MotherDuck service-account/share, and owner allowlist resources.
4. Apply the additive migration and DuckLake DDL only to the new WA estate.
5. Prove private Blob replay without source access before any bounded live source smoke.

The bounded smoke may use `fixtures/vehicle-market/scopes/wa-subaru-bounded.json`. A full collection additionally requires both environment gates, both CLI flags, private Blob access, and the WA Neon migration. Application startup, tests, builds, CI, and deployment never initiate collection.

## Hard boundaries

- Do not mutate, delete, migrate, or repoint the existing VIC estate.
- Do not enable full WA collection or public sharing without separate licensing confirmation.
- Do not compare through non-`COMPLETE` runs and never infer sale.
- Keep descriptions and feature strings out of the observation fact; keep the physical feature bridge deferred.
- Never expose Neon, Blob, MotherDuck, authentication, email, AI-provider, or embed credentials.
- External resource creation, credential changes, migrations, source execution, MotherDuck mutations, and deployment require explicit authorization.
