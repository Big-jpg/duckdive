# Work package 3 visual-evidence record

This record closes Work package 3 on 19 August 2026. Nine review-safe derivatives preserve the observed Price Frontier progression without requiring MotherDuck access or committing the private source set.

## Source-set audit

The supplied folder contains 52 Portable Network Graphics (PNG) files and 51 unique SHA-256 hashes. One byte-identical duplicate pair has the hash `0a969aa07edf2877afbe16eab34fead224e9325646749e97b72fa976072369b6`.

The manifest represents the pair through `706f00cb-2b8b-40df-9ae6-357c0689e95a.png`. It records `706f00cb-2b8b-40df-9ae6-357c0689e95a (1).png` as the duplicate filename without treating it as a second source. The original files remain outside Git.

## Published derivative set

The gallery at [`docs/assets/price-frontier/README.md`](../assets/price-frontier/README.md) gives every derivative descriptive alt text and a factual caption.

| Asset | Evidence treatment | Visible version | Privacy treatment |
| --- | --- | --- | --- |
| `01-conventional-scatterplot.png` | Observed screenshot | Not visible | Re-encoded without metadata |
| `02-corporate-memphis-restyle.png` | Observed screenshot | v8 | Re-encoded without metadata |
| `03-parameterized-ford-ranger.png` | Observed screenshot | v12 | Re-encoded without metadata |
| `04-cohort-relative-price-filter.png` | Composite of observed screenshots | v13 | Source listing ID column masked |
| `05-mileage-aware-investigation.png` | Composite of observed screenshots | v14 | Source listing ID column masked |
| `06-first-pass-shortlist.png` | Observed screenshot with redaction | v15 | Source listing ID column masked |
| `07-price-mileage-frontier.png` | Composite of observed screenshots | v16 | Row crop starts at asking price and excludes identity columns |
| `08-generalization-grid.png` | Composite of observed screenshots | Not visible | Every frame stops above its listing table |
| `09-contract-and-refusal-boundaries.png` | Composite of observed screenshots | Not visible | Contract fragments contain no listing identities |

The generalization grid shows Hyundai Getz, Land Rover/All, All/All, and Land Rover Range Rover Evoque. The contract composite shows metric definitions, cohort rules, validation caveats, and prohibited valuation, suitability, and sale claims.

## Visual privacy review

Manual review confirmed that the nine derivatives contain no source listing value, credential, token, share URL, user identity, or local path. The three opaque table masks cover their full identity columns. Other table derivatives crop identity columns or stop above the table.

No image-generation model altered the evidence. Deterministic re-encoding, cropping, masking, resizing, and compositing preserved the observed pixels. Captions identify every composite so readers do not mistake editorial assembly for one application frame.

## Automated verification

`corepack pnpm review:assets` runs without credentials or network access. The check verifies:

- The exact nine-file derivative set
- Dimensions and derivative SHA-256 hashes
- Source filename and source-hash records
- Canonical handling of the duplicate pair
- Gallery image links and alt text
- PNG structure with no ancillary metadata chunks
- Absence of public local paths, share URLs, and remote URLs in the manifest and gallery

The command passed locally. `node --check scripts/verify-price-frontier-assets.mjs` and `git diff --check` also passed.

No source acquisition, deployment, credential access, cloud mutation, or external-state verification occurred.
