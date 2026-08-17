# WA vehicle-market retention and disposal

## Authority and deadline

The WA Used Vehicle Listings dataset is temporary test evidence. Vehicle-market raw responses, operational facts, analytical tables, and temporary Dives must not persist beyond 2026-08-18 in Australia/Perth.

No scheduled deletion service is warranted for this one-off experiment. An operator performs and verifies cleanup under explicit approval. Do not run destructive steps early merely because this runbook exists.

## Inventory before deletion

Capture a content-free disposal manifest containing only identifiers and counts:

- Git commit and Vercel deployment IDs that served the WA branch;
- vehicle-market run UUIDs and statuses;
- count and total bytes beneath Blob prefix `vehicle-market/source=autotrader/market=wa-used/`;
- `wa_vehicle_market` dimension/fact counts and share name;
- WA starter Dive IDs and owner/workspace mapping IDs;
- Neon row counts for the five `ops.vehicle_market_*` tables.

Do not include listing data, descriptions, URLs, credentials, or raw payloads in the disposal manifest.

## Disposal order

1. Disable both live-source gates and confirm no acquisition process is running.
2. Disable or remove WA-specific application access and deploy the approved post-experiment Git state.
3. Revoke/delete WA Dive embed sessions and remove WA starter Dive mappings after verifying exact IDs.
4. Revoke the restricted `wa_vehicle_market` MotherDuck share.
5. Drop the exact `wa_vehicle_market` database.
6. Delete every object under the exact private Blob prefix `vehicle-market/source=autotrader/market=wa-used/`; do not target the store root or VIC prefixes.
7. Remove vehicle-market operational data from Neon. Because raw-object metadata is deliberately immutable, use a reviewed cleanup transaction that targets only the `ops.vehicle_market_*` tables and their exact migration ledger entry after the application no longer depends on migration 019.
8. Remove WA-only environment selectors that are no longer referenced. Do not rotate or delete shared Neon, Blob, MotherDuck, Auth, Resend, or AI credentials merely because the dataset was removed.

## Verification

After cleanup, prove:

- the Blob prefix lists zero objects;
- MotherDuck no longer lists `wa_vehicle_market` or its share;
- Neon contains no vehicle-market payload, request, validation, run, or publication records;
- no workspace maps to the four WA starter keys;
- authenticated and anonymous requests cannot open a WA Dive;
- `duckdive.gold` serves the approved post-experiment commit;
- no secrets or extracted records were written into Git, logs, screenshots, or the disposal manifest.

Record completion time in Australia/Perth and retain only the content-free reconciliation and deletion evidence permitted by the experiment.
