# DuckDive

DuckDive is an engineering case study in bounded agentic business intelligence. The repository shows how data contracts, governed analytical views, explicit quality policy, constrained tools, ownership, and version checks bound an agent that inspects data and changes analytical reports.

The current preserved experiment documents two WA vehicle-listing observations. Its reviewer workflow uses sanitized fixtures, keeps live acquisition disabled, and requires no credentials or external services.

## Run the reviewer baseline

Use Node.js 22 and pnpm 10.28.0. The baseline installs the frozen dependency graph, validates the application, and replays two sanitized fixture rows:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm vehicle:replay -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
```

The replay must report two source rows, two unique listings, zero duplicates, zero scope violations, one expected and fetched page, and `COMPLETE` status.

## Inspect the bounded system

The reviewable system separates responsibilities across these surfaces:

- Dataset contracts define supported entities, measures, assumptions, and refusal boundaries
- Quality policy decides which observations support snapshot or population comparisons
- Governed analytical queries preserve grains, cohort rules, lineage, and publication invariants
- Agent tools restrict reads, require a structured change plan, and permit one verified save
- Ownership and version checks prevent cross-workspace or stale writes
- Sanitized fixtures exercise the same replay and reconciliation path without source access

The registered dataset is `wa-vehicle-market`. Its four starter reports are Market Atlas, Market Movement, Vehicle Lens, and Data Observatory. The MotherDuck Business trial and Embedded Dives are unavailable, so the repository does not present them as a live review surface.

## Understand the repository states

The repository retains several experiments without presenting all of them as current product paths:

| Surface | Status | Reviewer interpretation |
| --- | --- | --- |
| WA vehicle-market contracts, fixtures, governed database definitions, and starter sources | Current preserved experiment | Primary bounded-agent evidence; fixture replay is supported |
| VIC housing ingestion, marts, notebooks, scraper, and starter sources | Historical experiment | Preserved implementation history; not registered in the current dataset registry |
| Power BI and Fabric semantic-model import | Tested prototype | Local archive and Tabular Model Definition Language parsing plus protected draft APIs; no complete visible workflow |
| World Health Organization operational runtime | Fixture adapter | Fixed resource used to test binding, reconciliation, query, and revocation policy; not a general connector |

[`docs/REPOSITORY_MAP.md`](docs/REPOSITORY_MAP.md) explains every tracked top-level directory and the boundaries between these states.

## Follow the review plan

Use these documents according to the task:

- [`REPOSITORY_REVIEW_PLAN.md`](REPOSITORY_REVIEW_PLAN.md): authoritative execution order and success gates
- [`NEXT_SESSION_HANDOFF.md`](NEXT_SESSION_HANDOFF.md): concise current-session orientation
- [`docs/REPOSITORY_MAP.md`](docs/REPOSITORY_MAP.md): directory purposes and experiment classifications
- [`docs/PLATFORM_OPERATIONS.md`](docs/PLATFORM_OPERATIONS.md): credentialed and historical operator procedures outside the reviewer path
- [`docs/WA_VEHICLE_MARKET_IMPLEMENTATION.md`](docs/WA_VEHICLE_MARKET_IMPLEMENTATION.md): WA implementation and fixture commands
- [`docs/WA_VEHICLE_MARKET_RETENTION.md`](docs/WA_VEHICLE_MARKET_RETENTION.md): current preservation authority and superseded disposal history

## Respect the external-state boundary

The reviewer path must not run vehicle acquisition, enable either source gate, mutate cloud data, deploy the application, or require MotherDuck, Neon, Vercel Blob, or Embedded Dives. Those actions need separate explicit approval and verified resource identities.

## License status

No license is currently granted. See [`LICENSE_STATUS.md`](LICENSE_STATUS.md) before copying, modifying, distributing, or reusing repository material.
