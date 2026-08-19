# Preserve the WA vehicle-market evidence

This record states the current retention authority and preserves the superseded disposal procedure as history. It does not authorize acquisition, external mutation, publication, or deletion.

## Current authority from 19 August 2026

The owner directed the repository review to preserve the retained WA Used Vehicle Listings evidence. Do not fully flatten or delete that data. The former deadline of 18 August 2026 no longer requires disposal.

Apply these boundaries during the review:

- Do not run another vehicle acquisition
- Keep both live-source gates disabled
- Do not delete or mutate MotherDuck, Neon, Vercel Blob, Embedded Dives, deployments, credentials, or other external state
- Treat the ended MotherDuck Business trial as unavailable live state, not evidence that remote data was removed
- Keep private raw responses, listing URLs, credentials, and unrestricted screenshots out of Git
- Preserve the repository fixtures, contracts, governed analytical semantics, and content-free evidence needed for engineering review

Any future disposal requires a new owner decision that names the exact resources and approved operation. Repository cleanup alone does not grant that authority.

## Superseded authority from 17 August 2026

The original temporary-experiment authority required disposal by 18 August 2026 in Australia/Perth. The owner superseded that instruction on 19 August 2026 before this review cleanup began.

The following procedure remains historical context. Do not execute it under the current authority.

### Historical inventory before deletion

The former runbook required a content-free manifest with:

- Git commit and Vercel deployment identifiers that served the WA branch
- Vehicle-market run identifiers and statuses
- Object count and total bytes beneath the dedicated private Blob prefix
- `wa_vehicle_market` dimension and fact counts, plus its share name
- WA starter Dive identifiers and owner or workspace mapping identifiers
- Neon row counts for the five `ops.vehicle_market_*` tables

The manifest excluded listing data, descriptions, URLs, credentials, and raw payloads.

### Historical disposal sequence

The inactive sequence was:

1. Disable both live-source gates and confirm that no acquisition process is running.
2. Disable WA-specific application access and deploy an approved post-experiment Git state.
3. Revoke WA Dive embed sessions and remove exact WA starter mappings.
4. Revoke the restricted `wa_vehicle_market` MotherDuck share.
5. Drop the exact `wa_vehicle_market` database.
6. Delete objects only beneath the dedicated WA vehicle-market Blob prefix.
7. Remove exact vehicle-market operational records from Neon through a reviewed transaction.
8. Remove unused WA-only environment selectors without changing shared credentials.

### Historical verification

The inactive verification required proof that the dedicated Blob prefix, MotherDuck database and share, Neon records, workspace mappings, and authenticated WA Dive access were absent. It also required a content-free reconciliation record and confirmation that no secrets or extracted records entered Git, logs, screenshots, or the disposal manifest.

These checks describe the superseded disposal procedure. They are not claims about current external state.
