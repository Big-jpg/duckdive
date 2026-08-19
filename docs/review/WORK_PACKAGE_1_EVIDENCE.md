# Work package 1 baseline evidence

This record captures the 19 August 2026 Gate 1 checks. It distinguishes completed repository checks from validation blocked by workstation policy.

## Outcome

Gate 1 remains open. Retention, path portability, safety scans, local acquisition gates, lint, fixture replay, and diff hygiene pass. A clean pnpm install, the complete test suite, type checking, and the production build still require an approved host that can run pnpm.

No in-scope vehicle source, MotherDuck, Neon, Vercel Blob, Embedded Dive, deployment, or credential state was read or changed during these checks.

## Retention and licensing

- `docs/WA_VEHICLE_MARKET_RETENTION.md` records the owner’s 19 August preservation decision
- The former 18 August disposal deadline remains only as inactive historical context
- `docs/WA_VEHICLE_MARKET_IMPLEMENTATION.md` no longer treats disposal as current authority or depends on an operator’s local file
- `LICENSE_STATUS.md` states that no license is currently granted

## Artifact inventory

The baseline at commit `a9228d6` contains 579 tracked files. Of these, 307 are beneath `.agents`, 179 are beneath `src`, 24 are beneath `db`, 23 are beneath `scripts`, and 11 are beneath `fixtures`.

Tracked data-like assets comprise 22 JSON files and two PNG files. No CSV, Parquet, DuckDB, ZIP, or screenshot evidence set is tracked. The ten vehicle-market JSON assets are sanitized or synthetic contracts, probes, scopes, expectations, and replay fixtures. Inspection found fixture identifiers and descriptions rather than retained private listing records.

The largest tracked files are:

- `public/duckdive.png`: 1,421,915 bytes
- `public/favicon.png`: 835,652 bytes
- `pnpm-lock.yaml`: 399,594 bytes at the baseline commit
- `rea-data-modelling/nb_curate_property_sales_data.ipynb`: 101,107 bytes

Local ignored artifacts present on the workstation include `.env.local`, `node_modules`, `.next`, `.pnpm-store`, `.swc`, `.vercel`, and `tsconfig.tsbuildinfo`. The ignored `rea-collections`, `.vehicle-market-evidence`, and `rea_sales_data_model` directories are absent.

## Safety scans

The host does not provide Gitleaks or TruffleHog. The fallback scan searched the working tree and every reachable Git commit for high-confidence token formats, credential-bearing database URLs, environment files, private service URLs, and absolute user paths. It returned file paths only before manual classification, so it did not print candidate values.

The scan found two current credential-pattern candidates. `.env.example` contains placeholder values, and `src/lib/db.test.ts` contains a synthetic example URL. Current private-URL candidates are public service endpoints, runtime URL templates, or placeholders. Git history contains only `.env.example` as an environment file. Historical absolute paths occur in four documentation files, but the current working tree contains none.

The current tree contains no identified secret, credential, private share URL, private raw vehicle payload, or absolute user path. This conclusion covers the defined high-confidence patterns and manual classification, not an unavailable third-party scanner’s full rule set.

## Acquisition boundary

Both vehicle-market flags are false in `.env.example` and false or unset in the ignored local environment. `assertLiveAcquisitionAuthorized` rejects smoke acquisition without `VEHICLE_MARKET_SOURCE_ENABLED=true` and rejects full acquisition without the second full-population flag. Its unit tests passed with mocked requests.

No live acquisition command ran. The only vehicle-market command replayed repository fixtures without loading `.env.local`.

## Validation baseline

The host runs Node.js 22.16.0 and Git 2.50.0. Validation ran sequentially.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | Blocked | Both offline pnpm entry paths stop before startup with a group-policy error |
| Unit tests | Blocked | 56 suites pass, one suite cannot load `jszip`, and all 191 collected tests pass |
| Lint | Pass | Zero errors and 17 warnings, all beneath vendored `.agents/skills/vercel-optimize` files |
| Type check | Blocked | Missing `@neondatabase/auth/next/server` and `jszip`; dependent archive values remain `unknown` |
| Production build | Blocked | Next.js stops at the missing `@neondatabase/auth/next/server` import |
| Sanitized fixture replay | Pass | Two source rows, two unique listings, zero duplicates, zero scope violations, one expected and fetched page, status `COMPLETE` |
| `git diff --check` | Pass | No whitespace errors |
| Tracked working tree | Pass | Only intended Work package 1 documentation changes are present |

Both missing packages are declared in `package.json` and resolved in `pnpm-lock.yaml`. Neither package has a workspace link or virtual-store entry in the incomplete local installation.

## Required continuation on an approved host

Use a clean checkout of the Work package 1 branch and run these commands sequentially:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm vehicle:replay -- --manifest fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json
git diff --check
git status --short
```

Do not load production credentials for this continuation. If the clean install succeeds but a validation still fails, treat that failure as repository work rather than a workstation limitation. Keep Gate 1 open until every remaining condition passes.
