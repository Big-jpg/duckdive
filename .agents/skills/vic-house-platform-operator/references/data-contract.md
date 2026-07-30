# Data Contract

## Immutable source baseline

| Measure | Expected |
|---|---:|
| CSV files | 83 |
| Source rows | 88,422 |
| Unique observation keys | 88,422 |
| Earliest sold date | 2004-09-14 |
| Latest sold date | 2026-07-18 |
| Missing addresses | 0 |
| Rows without parsed numeric price | 5,534 |

The source path is `rea_sales_data_model/VIC`. Files are immutable and identified by SHA-256.

## Layers, identity, and grain

- `ops`: manifest, migration ledger, checksums, byte counts, status, errors, and auditability.
- `raw`: immutable parsed observations at source-row grain.
- `core`: canonical properties, listings, and independent sale events.
- `mart`: application-serving suburb dimension and monthly aggregates.
- `app`: users, workspaces, chats, settings, throttling, auth attempts, and audit events.
- Property identity is a SHA-256 fingerprint of normalized address, state, and postcode with method `NORMALIZED_ADDRESS` and confidence `0.9000`.
- Analytical suburb identity is state-qualified normalized suburb, for example `vic-yarraville`; postcode is display/lineage metadata.
- `mart.suburb_monthly_sales` grain is `suburb_key x sale_month`.
- MotherDuck `suburb_sale_facts` grain is one curated sale event.

## Metric semantics

- Publish only `state = VIC` and case-insensitive `property_type = House`.
- Volume includes all completed in-scope sales.
- Price statistics use reported AUD 50,000 through 20,000,000 inclusive.
- Land statistics use 50 through 10,000 square metres inclusive.
- Return valid-sample counts beside price and land statistics.
- Sales velocity is completed detached-house sales per month over the latest rolling 12 months; compare with the immediately preceding 12 months.
- Unpriced sales remain in volume and are excluded only from price statistics.

`src/lib/analytics-contract.ts` and its tests are executable authority.

## MotherDuck and API contract

The native database is `vic_house_data`. Publication atomically replaces `suburb_dimension`, `suburb_monthly_sales`, and `suburb_sale_facts`, then creates the automatic restricted share `vic_house_data_app` with `explorer` read access. Dives reference the resulting `md:_share/...` URL.

Authenticated interfaces are `/api/stats`, `/api/analytics/suburbs`, `/api/analytics/suburb-sales`, `/api/analytics/suburb-insights`, and `/api/gallery`. Public capability access is limited to unlisted `/share/[slug]`; `POST /api/ingest` is independently secret-protected. Authenticated owners manage links through `/api/dives/[diveId]/share`. Never accept arbitrary public SQL or public Dive IDs; keep routes, parameters, metrics, filters, and result sizes allowlisted and bounded.
