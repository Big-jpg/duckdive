---
name: vic-house-platform-operator
description: Provision, publish, deploy, validate, and troubleshoot the VIC House Data Lab across Vercel, Vercel Blob, the Vercel Neon Postgres integration, MotherDuck Business and Embedded Dives. Use for production setup, environment variables, credential handoffs, database migrations, CSV ingestion, MotherDuck publication and sharing, service-account isolation, deployment, incident diagnosis, or analytics-contract changes in this repository.
---

# Operate the VIC House Data Platform

Treat the repository as the source of truth. Never copy credentials into this skill, committed files, logs, chat responses, or command arguments.

## Start here

1. Read [references/platform-contract.md](references/platform-contract.md) for topology, environment ownership, isolation, and credential rules.
2. Read [references/data-contract.md](references/data-contract.md) before changing ingestion, models, metrics, marts, APIs, or Dives.
3. Read [references/operations.md](references/operations.md) for provisioning, release, recovery, and validation commands.
4. Inspect the current repository and live systems before mutating either. Existing state wins over assumptions in these references.

## Operating rules

- Keep browser traffic behind Next.js server routes. Never expose Neon or MotherDuck tokens to the browser.
- Keep the VIC Neon project isolated from historical WA or unrelated projects.
- Use `DATABASE_URL_UNPOOLED` for migrations and bulk ingestion; use the pooled URL for application traffic.
- Expect Vercel Sensitive variables to download as `[SENSITIVE]`. Do not try to decode or bypass this protection.
- Ask the human for a quick signed-in dashboard action or credential copy when it is safer and materially cheaper than building a workaround. State the exact value, source, and destination required.
- Use ephemeral process environment variables for local privileged commands. Never commit `.env.local`.
- Make all ingestion and migrations idempotent. Preserve immutable source files and SHA-256 lineage.
- Require explicit confirmation before MotherDuck DDL, share creation, service-account creation, token rotation, or other external mutations when the active tool requires it.
- Reconcile the fixed source baseline before publication. Do not explain discrepancies by silently deleting rows.
- Publish complete replacement tables to MotherDuck atomically, then smoke-test before promoting or announcing success.
- Use a backend-created, short-lived Embedded Dive session. Keep admin and service-account credentials server-only.
- Treat AI remixing as unavailable until at least one supported provider credential is configured and preflight passes.

## Completion standard

Do not call the platform live merely because Vercel reports `Ready`. Require the source baseline reconciled in Neon; MotherDuck serving tables populated and scoped; the organization share configured; public embed sessions and analytics APIs working; tests, lint, typecheck, build, preflight, and production smoke checks passing; and no credentials or generated data files staged in Git.
