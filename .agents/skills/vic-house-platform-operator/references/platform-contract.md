# Platform Contract

## Topology

```text
Immutable VIC CSV archive
  -> idempotent loader or private Vercel Blob + Workflow
  -> isolated Neon Postgres (raw, core, mart, app, ops)
  -> atomic publication to native MotherDuck database vic_house_data
  -> automatic organization share
  -> backend-created Embedded Dive sessions
  -> Next.js application on Vercel
```

The browser talks only to Next.js routes. Next.js owns authentication, authorization, query shaping, workspace routing, MotherDuck Admin API calls, MCP access, and embed-session creation.

Personal Dives may be deliberately published as unlisted capability links. `app.dive_share` binds an 80-bit slug to a workspace-owned Dive. `/share/[slug]` is view-only and no-index; the server resolves active, unexpired records and mints a fresh short-lived embed session. Revocation invalidates the durable slug immediately. Never use a MotherDuck session token or raw Dive ID as the share contract.

## Environment ownership

| Variable | Owner/source | Rule |
|---|---|---|
| `DATABASE_URL` | Vercel Neon integration | Pooled application connection. |
| `DATABASE_URL_UNPOOLED` | Vercel Neon integration | Direct migrations and bulk ingestion. |
| `DATABASE_READ_URL` | Optional Neon read endpoint | Read-only publication/stats. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob integration | Private archive access only. |
| `VERCEL_OIDC_TOKEN` | Vercel CLI/runtime | Short-lived local integration access. |
| `MOTHERDUCK_TOKEN` | Admin in Business-enabled organization | Must belong to the organization with service-account and Embedded Dives entitlement. |
| `MOTHERDUCK_DATABASE` | Repository contract | Must be `vic_house_data`. |
| `MOTHERDUCK_SHARE_URL` | MotherDuck publication output | Must be an actual `md:_share/...` organization-share URL. |
| `MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME` | Repository contract | Default `vic_house_lab`; public read boundary. |
| `NEON_AUTH_BASE_URL` | Neon Auth production branch | Server-only branch Auth endpoint. |
| `NEON_AUTH_COOKIE_SECRET` | Operator-generated | Stable, at least 32 characters; changing it invalidates sessions. |
| `RESEND_API_KEY` | Resend | Server-only magic-link delivery credential. |
| `AUTH_EMAIL_FROM` | Verified Resend domain | Non-secret sender identity. |
| `INGEST_SECRET` | Operator-generated | Protects `POST /api/ingest`. |
| AI provider keys | Selected provider | Configure at least one for remixing. |
| `NEXT_PUBLIC_SITE_URL` | Production deployment | Absolute HTTPS canonical URL. |
| Estate variables | Repository contract | `VIC` and `House`. |

Model-name variables are selectors, not credentials.

## Credential handoff rules

1. Vercel Sensitive variables deliberately download as `[SENSITIVE]`; local CLI commands cannot recover them.
2. Ask the human for a quick signed-in dashboard action or credential copy when it is safer and materially cheaper than automation. State the exact value, source, and destination.
3. Prefer direct placement in ignored `.env.local` or the named dashboard field. Do not ask for credentials in chat unless the human explicitly chooses that channel.
4. Never place credentials in committed files, command arguments, logs, screenshots, or agent rules.
5. The MotherDuck admin token must be scoped to the Business-enabled organization. A service-account quota 403 after upgrade usually indicates entitlement propagation or organization/token mismatch.

## Isolation and connection posture

- Keep this public VIC estate in its own Neon project and MotherDuck database.
- Unlisted `/share/*` readers use a controlled service-account identity and read-only organization share; the main app and analytics APIs require active allowlisted membership.
- Each editor gets isolated Dive IDs and chat history; the backend enforces ownership.
- Only an authenticated owner may publish or revoke a personal Dive link. Public slug resolution never accepts an arbitrary Dive ID.
- For future unrelated customers, prefer per-customer databases or service-account/workload boundaries over shared `tenant_id` filtering.
- Use PostgreSQL drivers for this serverless TypeScript backend. Add MotherDuck read scaling only when measured concurrency justifies it.
