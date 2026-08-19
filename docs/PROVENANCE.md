# Source and third-party provenance

This document identifies what the repository preserves, where its review evidence came from, and which rights or live-state claims it does not make. It is a provenance record, not a license grant.

## Repository-created implementation

The TypeScript application, database migrations, analytical contracts, bounded-agent controls, tests, fixtures, validation scripts, and documentation are maintained in this repository. Git history is the record of their evolution. AI-assisted implementation and editorial work were reviewed and accepted by the repository owner; executable claims are supported by tests and committed evidence rather than authorship alone.

The DuckDive wordmark, favicon, and interface artwork in `public/` are repository presentation assets. Their presence does not grant reuse rights.

## WA vehicle-market experiment

The retained experiment was informed by public used-vehicle listing observations collected for bounded analysis. Raw acquisitions and original listing payloads are not tracked. The repository includes sanitized source-behaviour fixtures, a two-row deterministic replay fixture, governed DuckLake SQL, quality policy, and analytical tests.

The Price Frontier narrative is pinned to an observed 11 August 2026 session. The owner supplied the conversation transcript and 52 screenshots outside Git. Nine curated derivatives preserve the analytical progression while removing or masking listing identifiers and metadata. [`docs/assets/price-frontier/manifest.json`](assets/price-frontier/manifest.json) records source hashes, derivative hashes, redactions, crops, and the byte-identical duplicate without publishing the original files.

The executable Price Frontier is a later reference reconstruction. It is not represented as the original version 16 Dive source or as a reconstruction of the historical rows.

## Retained historical and prototype sources

- `rea-data-modelling/`, `rea-sold-scraper/`, and the VIC-oriented database and application modules preserve a historical detached-house experiment. The original property archive is ignored and not part of repository review.
- Power BI/Fabric import code tests archive validation and Tabular Model Definition Language parsing. It is a prototype, not a complete supported workflow.
- The World Health Organization resource is used as a fixed fixture adapter for runtime-policy tests. The repository does not claim ownership of WHO content or provide a general WHO connector.

See [`docs/REPOSITORY_MAP.md`](REPOSITORY_MAP.md) for the authoritative classification of these surfaces.

## Third-party software and services

Declared JavaScript dependencies and their resolved versions are recorded in `package.json` and `pnpm-lock.yaml`. They retain their own licenses and notices. Principal technologies referenced by the implementation include Next.js, React, TypeScript, Vitest, DuckDB, PostgreSQL, Vercel, Neon, MotherDuck, Model Context Protocol tooling, and supported AI-provider SDKs.

The continuous-integration workflow uses GitHub Actions maintained by GitHub and pnpm. Product and company names are used descriptively and remain the property of their respective owners. No vendor mention implies endorsement, entitlement, or current service availability.

## Availability and rights boundaries

- The MotherDuck Business trial and Embedded Dives used during the experiment are unavailable for current review.
- No live MotherDuck, Neon, Vercel Blob, Vercel deployment, vehicle source, share, or credential was reverified by the repository-cleanup work.
- External source terms and third-party rights have not been resolved into an open-source license.
- [`LICENSE_STATUS.md`](../LICENSE_STATUS.md) therefore remains authoritative: no license is currently granted for repository material.

Questions about a specific artifact should be resolved before copying, redistribution, or reuse.
