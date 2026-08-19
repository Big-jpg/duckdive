# Understand the DuckDive repository

This reference maps the tracked repository to its current, historical, prototype, and fixture roles. It helps reviewers distinguish executable evidence from preserved implementation history.

## Classify the retained work

DuckDive retains four distinct bodies of work:

| Body of work | Classification | Basis |
| --- | --- | --- |
| WA used-vehicle listings | Current preserved experiment | Registered dataset, sanitized replay fixtures, source contracts, quality policy, governed database definitions, and four starter sources |
| VIC detached-house sales | Historical experiment | Complete ingestion and analytical implementation retained for history, but excluded from the active dataset registry |
| Power BI and Fabric semantic-model import | Tested prototype | Browser-only archive validation, Tabular Model Definition Language parsing, contract review, protected APIs, migrations, and focused tests exist; the current interface has no complete upload-to-runtime path |
| World Health Organization operational runtime | Fixture adapter | A fixed public sample resource exercises owner binding, schema reconciliation, structured queries, revocation, and failure boundaries |

These classifications constrain public claims. Prototype and fixture code cannot support claims about a complete generalized product workflow.

## Understand the active dataset registry

`src/lib/datasets.ts` registers only `WA_VEHICLE_MARKET_DATASET`. That definition is the default dataset used by current workspace and starter resolution.

`VIC_HOUSING_DATASET` remains exported but intentionally unregistered. Tests use it to verify shared dataset contracts, runtime validation, starter rendering, ownership checks, and bounded agent tools against the historical implementation. Registering it would expose a second product path whose live MotherDuck share, starter ownership, and deployment state were not reverified during this cleanup.

The unregistered definition therefore serves two purposes: it preserves the historical contract and supplies a non-WA test case for reusable infrastructure. It does not assert that VIC housing is currently available.

## Map the tracked directories

Every tracked top-level directory has one review purpose:

| Directory | Purpose | Classification |
| --- | --- | --- |
| `.agents/` | Repository-specific platform operating contract | Current repository guidance; generic skills come from `skills-lock.json` |
| `db/` | Additive Neon migrations plus DuckLake definition, staging, and publication Structured Query Language (SQL) | Mixed current and historical infrastructure evidence |
| `docs/` | Review plans, operating boundaries, retention authority, and recorded validation evidence | Current documentation |
| `fixtures/` | Sanitized vehicle-market responses, probes, expected results, scopes, and replay manifests | Current deterministic evidence |
| `public/` | DuckDive brand and favicon assets | Current application assets |
| `rea-data-modelling/` | VIC housing raw-load, cleaning, and curation notebooks | Historical experiment |
| `rea-sold-scraper/` | Browser extension and headless runner for historical property-sales collection | Historical experiment |
| `scripts/` | Local validation, migration, ingestion, publication, smoke, access, and vehicle-market command entry points | Mixed reviewer and operator tooling |
| `src/` | Next.js application, bounded agent runtime, dataset contracts, analytical policies, starter sources, and tests | Current application with retained historical and prototype modules |
| `workflows/` | Durable private-Blob-to-Neon property ingestion workflow | Historical VIC experiment |

## Map notable root files

The root also contains files that define review or historical behavior:

- `collection-plan.json`: historical sample plan for the REA sold-property collector
- `package.json` and `pnpm-lock.yaml`: private `duckdive` package and frozen dependency graph
- `skills-lock.json`: reproducible sources and hashes for generic agent skills that are not vendored
- `AGENTS.md`: repository-specific execution and safety rules
- `REPOSITORY_REVIEW_PLAN.md`: authoritative cleanup and case-study plan
- `NEXT_SESSION_HANDOFF.md`: concise session orientation
- `LICENSE_STATUS.md`: current no-license notice

Generated and local-only directories such as `node_modules`, `.next`, `.pnpm-store`, `.vercel`, `.vehicle-market-evidence`, and `rea-collections` are ignored. They are not repository evidence.

## Keep live acquisition outside review

The vehicle-source adapter remains for historical and architectural inspection. Both environment gates default to false, and acquisition requires an explicit operator command plus separate authorization flags.

Reviewer commands use only `fixtures/vehicle-market`. They must not load production credentials, contact the vehicle source, or mutate external state.
