# Next Session Handoff

Last verified: 2026-07-30 (Australia/Perth)

## Auth phase continuation update

The allowlisted Neon Auth implementation is deployed to production at `https://duckdive.gold`. Production credential, trusted-origin, provider, webhook, and OAuth verifier configuration are complete. GitHub login now persists and the owner reaches the private editor. The remaining auth release work is a controlled revoked-user smoke test.

- Production Neon migrations `010_allowlisted_neon_auth.sql` and `011_auth_webhook_response.sql` are applied.
- Production currently has one linked active `app.app_user` row and one workspace for `rossfarrell7@gmail.com`.
- The main app, Dives, gallery, stats, analytics, chat, edit, personal embed/version/revert, and share-management routes now require an active allowlisted Neon Auth session.
- `/share/*` remains public, no-index, view-only, and capability-based. `POST /api/ingest` remains protected only by `INGEST_SECRET`.
- Magic-link requests are allowlist-gated and non-enumerating. A signed `user.before_create` webhook provides a second fail-closed signup gate.
- `send.magic_link` webhook delivery uses Resend after verifying Neon's rotating Ed25519/JWKS signature, timestamp, event ID/type, and an idempotent persisted response.
- Password login, password hashing, `editor:create`, and the legacy application session cookie are removed. Owner commands are `access:add`, `access:revoke`, and `access:list`.
- Current local validation: 10 test files / 28 tests passed; lint, TypeScript, local production build, Vercel production build, `db:reconcile`, and `smoke:motherduck` pass.
- Vercel Production and Preview now contain `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`; `NEXT_PUBLIC_SITE_URL` is configured for Production, Preview, and Development. Secret values were transferred without printing them.
- `https://duckdive.gold` is attached to the Vercel production project with valid configuration and its Resend domain is verified. Use `DuckDive <noreply@duckdive.gold>` as the sender and `https://duckdive.gold` as the canonical application origin.
- Neon Auth application name is `DuckDive`; trusted origins contain exactly `https://duckdive.gold`; GitHub initiation returns a valid OAuth redirect.
- OAuth persistence fix: `src/proxy.ts` runs Neon Auth middleware only when `neon_auth_session_verifier` is present, cookies use `SameSite=Lax`, the catch-all handler exports GET and POST, and new/existing GitHub users share `/auth/complete`. Production initiation now sets a Secure, HttpOnly Lax challenge cookie.
- The blocking Neon Auth webhook is enabled at `https://duckdive.gold/api/webhooks/neon-auth` for exactly `User Before Create` and `Send Magic Link`. A live allowlisted magic-link request returned 202 and its signed webhook returned 200 after Resend delivery.
- `rossfarrell7@gmail.com` is the first active production allowlist administrator.
- Vercel Functions are explicitly pinned to Sydney (`syd1`) through `vercel.json`, beside the Sydney Neon/Auth estate. Before/after warm measurements improved anonymous auth/API checks from about 0.5-1.0 seconds to 0.13-0.42 seconds and the unlisted magic-link authorization path from about 6.0 seconds to 0.10-0.38 seconds.
- Production AI incident: Vercel Functions expose OIDC through request context rather than `process.env.VERCEL_OIDC_TOKEN`. The original provider guard rejected production before AI SDK authentication. `src/lib/ai-provider.ts` now returns the Gateway model as a plain string on Vercel so AI SDK can consume runtime OIDC; the project OIDC setting is verified enabled with team issuer mode.

Remaining production sequence:

1. Revoke/reactivate the owner once to prove fail-closed authorization without losing the stable `app_user.user_id`.
2. Optionally execute a direct non-allowlisted signup attempt to exercise `User Before Create`; the public request-link endpoint already returns the same generic 202 for an unlisted address without contacting Neon.
3. Remove legacy Vercel `AUTH_SECRET` only after the revoked-user path passes.
4. Run the authenticated `/api/chat` smoke; standalone Vercel AI Gateway streaming is already verified through OIDC.

The older objective notes below describe the design context and pre-implementation state; this continuation update is authoritative where they differ.

## Suggested bootstrap prompt

> Read `AGENTS.md`, `NEXT_SESSION_HANDOFF.md`, and the complete `vic-house-platform-operator` skill. Continue from the verified production state; do not reprovision Neon, MotherDuck, Dives, or share links unless inspection proves it necessary. Implement the next objective: allowlisted Neon Auth with magic-link login and Resend delivery, while preserving `/share/*` as the intentional public read-only capability route. Start with read-only verification and tell me the smallest human dashboard/credential action that materially unblocks you.

## Start here

1. Read `AGENTS.md` and `.agents/skills/vic-house-platform-operator/SKILL.md` plus its three references.
2. Read this file completely before changing local or external state.
3. Run `git status --short`, `git log -1 --oneline`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`.
4. Reverify time-sensitive external state before acting. Never copy credentials into chat, source, commands, or this file.

## Source and production state

- Repository: `C:\Users\rossf\Desktop\vic-house-data-lab`
- Branch: `main`
- Current base commit: `f0ec9e4` (`Document session handoff requirements`).
- The auth and DuckDive changes are an intentionally uncommitted working tree.
- Vercel project: `big-team/vic-house-data-lab`
- Canonical production URL: `https://duckdive.gold`
- Current production deployment: `dpl_537cPQ3boukDtYNZzJ83uurjbxwe` (READY, aliased to `duckdive.gold`, Functions verified in `syd1`).
- Neon project shown by the user: `neon-vic-house-data`; keep it isolated from WA or unrelated estates.
- Migration `009_dive_shares.sql` is applied in production Neon.
- Production now has one linked owner row in `app.app_user` and one workspace. Query counts again before any future auth migration.

## What is genuinely live

- Neon contains the complete immutable VIC archive: 83 CSVs and 88,422 source observations.
- Reconciliation passed with dates `2004-09-14` through `2026-07-18`.
- Neon serving counts last verified: 70,430 properties, 84,949 listings, and 84,640 sales.
- Native MotherDuck database `vic_house_data` contains:
  - `suburb_dimension`: 70 VIC House suburbs
  - `suburb_monthly_sales`: 11,110 rows
  - `suburb_sale_facts`: 83,598 rows
- Automatic organization share `vic_house_data_app` exists and `MOTHERDUCK_SHARE_URL` is configured in Vercel Production and Preview.
- MotherDuck service account `vic_house_lab` exists.
- Application Dives exist and are owned by `vic_house_lab`:
  - VIC Market Pulse: `5323b2cb-5b06-4925-8c72-8b707f90fb34`
  - Suburb Story: `9a6c0ef2-fb2a-46a7-ada5-ce8951b5ac6c`
  - Market Matchup: `59154f83-fe49-4fe4-ac56-d61fc462a815`
- `/api/stats`, MotherDuck analytics routes, `/api/gallery`, and all three Embedded Dives returned live data.
- The production UI was visually inspected after correcting reserved SQL aliases; it had zero Dive query errors.

## Unlisted Dive sharing

This feature is implemented, migrated, documented, deployed, and production-smoked.

- Authenticated owners manage a personal Dive through `GET|POST|DELETE /api/dives/[diveId]/share`.
- `POST` creates an unlisted, read-only `/share/<slug>` URL and is idempotent while the share is active.
- Slugs use an 80-bit random suffix and are stored in `app.dive_share`.
- Public resolution accepts only a valid active/unexpired slug; it never accepts a raw public Dive ID.
- Each page load mints a fresh short-lived MotherDuck embed session.
- Share pages are `noindex`, view-only, revocable, and return 404 after revocation.
- Editor controls are `Publish link`, `Copy link`, and `Revoke link` in `src/components/EditLab.tsx`.
- Production lifecycle passed: anonymous 200/render, zero query errors, revoke, same slug 404, exact QA cleanup.
- No QA share or QA user was left behind. The test identity is exactly `qa-share-link@invalid.local`.
- Repeatable harness:

```powershell
pnpm smoke:share create
# Open the emitted production slug anonymously.
pnpm smoke:share revoke
# Confirm the same URL returns 404.
pnpm smoke:share cleanup
```

Always run cleanup if the smoke sequence is interrupted.

## Validation at handoff

- 8 test files / 23 tests passed.
- ESLint passed.
- TypeScript passed.
- Local and Vercel production builds passed.
- `db:reconcile` passed all immutable baseline checks.
- `smoke:motherduck` passed.
- Repo-local operator skill validation passed.
- Secret-pattern scan passed.
- Recent production logs contained only expected share-page GET requests, no runtime errors.

## Environment state (names only)

Vercel Production and Preview contain the Neon integration variables, Neon Auth variables, Resend variables, `MOTHERDUCK_TOKEN`, `MOTHERDUCK_SHARE_URL`, legacy `AUTH_SECRET`, `INGEST_SECRET`, Blob integration variables, estate variables, and MotherDuck endpoint selectors. `NEXT_PUBLIC_SITE_URL` is set across Production, Preview, and Development.

Known missing capability variables:

- No static `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AI_GATEWAY_API_KEY` is configured. Vercel AI Gateway OIDC is active: `pnpm smoke:ai-gateway` successfully streamed through `openai/gpt-5.6-sol`. The application defaults to Gateway model `openai/gpt-5.4`; authenticated `/api/chat` remains the final AI release smoke.
- Neon Auth is provisioned; GitHub, Magic Link, trusted origins, and the blocking webhook are configured and production-verified.
- Resend is configured with a verified `duckdive.gold` domain and the application sender `DuckDive <noreply@duckdive.gold>`.

Local credential posture:

- `.env.local`, `.env.blob`, and `.vercel` are ignored.
- Local Neon URLs and a MotherDuck operator token were usable at handoff. Inspect only presence/placeholder state; never print values.
- Vercel Sensitive variables pull locally as literal `[SENSITIVE]`; ask the human for a direct dashboard-to-ignored-file handoff when needed.
- Local `pnpm preflight` currently also lacks `MOTHERDUCK_SHARE_URL`; production Vercel still has the variable and the live MotherDuck smoke passes. Restore the share URL to ignored `.env.local` before relying on local preflight.

## Highest-priority next objective: allowlisted Neon Auth

User intent: make the main application personal and allowlist-only, using Neon Auth magic links and Resend for email delivery. Preserve unlisted `/share/*` links as the deliberate public, view-only exception unless the user changes that policy.

Recommended authorization design:

1. Provision Neon Auth on the production branch of the existing isolated Neon project. Reverify the current official Neon Auth SDK and Magic Link documentation before coding; the product changed materially in 2026.
2. Use Neon Auth only to prove identity. Keep application authorization in Neon `app` schema.
3. Evolve `app.app_user` additively into the allowlist/profile table:
   - make `password_hash` nullable during transition;
   - add unique nullable `auth_subject` (Neon Auth user ID);
   - add constrained `role` (`member`/`admin` is sufficient initially);
   - add constrained `status` (`active`/`revoked`);
   - add invitation and last-login timestamps.
4. On a valid Neon Auth session, normalize the verified email and atomically link it only to an existing active allowlist row. Never auto-allow a newly authenticated email.
5. Once Neon Auth works end to end, remove the password login UI/routes and password helper. Preserve existing `user_id` values so workspace, chat, quota, audit, and share foreign keys remain stable.
6. Add owner commands such as `access:add`, `access:revoke`, and `access:list` that do not print secrets.
7. Route policy:
   - Require active allowlisted sessions for `/`, `/dives/*`, `/edit`, gallery/stats/analytics APIs, chat, personal embed/version/revert, edit, and share-management APIs.
   - Keep `/share/*` public capability URLs, no-index and read-only.
   - Keep Neon Auth handlers/callbacks and the login/request-link page public.
   - Keep `POST /api/ingest` protected by `INGEST_SECRET`, not user cookies.
8. Resend is transport only, never authorization. Prefer placing its API key in ignored `.env.local` and Vercel Sensitive variables. Validate webhook signatures if Neon Auth webhooks are used.
9. Test denied paths as seriously as successful login: non-allowlisted verified email, revoked member, expired/replayed magic link, unauthenticated APIs, cross-origin writes, revoked share slug, and preserved `/api/ingest` behavior.

Human handoff likely required:

- If no Neon MCP/API is available, ask Ross to enable Neon Auth for the production branch in the Neon Console and enable the Magic Link plugin, then place the emitted base URL into ignored `.env.local` as `NEON_AUTH_BASE_URL`.
- Ask Ross to place a Resend API key in ignored `.env.local` as `RESEND_API_KEY` and provide the verified from-address/domain name (the address is configuration, not a secret).
- Generate `NEON_AUTH_COOKIE_SECRET` locally (at least 32 characters) and set the same stable value in Vercel Production/Preview; do not rotate casually because it invalidates sessions.

## Other deferred items

### AI remixing

Vercel AI Gateway credits and OIDC are active. Refresh local authentication with `vercel env pull .env.ai-gateway.local --yes --environment=development`, then run `pnpm smoke:ai-gateway`. The verified standalone smoke uses `openai/gpt-5.6-sol`; the application defaults to `openai/gpt-5.4`. A static Gateway key is optional. Run `pnpm preflight` after supplying the separate missing MotherDuck share URL, then exercise `/api/chat` through the authenticated workspace.

### Vercel Blob archive

The immutable CSV archive was not uploaded. Local Vercel OIDC carried a `development` claim while the Blob project connection allowed only Production/Preview. Either enable the project’s Development connection on the Blob store or place a dedicated Blob read/write token in ignored `.env.blob`, then run `pnpm archive:blob`. The previous failure happened before writes, so no partial archive was created.

### MotherDuck billing

The user showed a MotherDuck Business trial with five days remaining on 2026-07-30. This is time-sensitive: reverify current plan/billing immediately in the next session so Embedded Dives and service accounts do not lapse.

## Safety and continuity rules

- Never repeat or rotate the Neon URL/password the user previously pasted unless explicitly asked. The user accepted the exposure risk.
- Do not recreate `vic_house_data`, republish data, or recreate Dives unless verification shows they are missing or stale.
- Do not touch the unrelated MotherDuck Fabric Dive/database.
- Do not expose MotherDuck tokens, Neon URLs, Resend keys, embed-session tokens, or magic-link tokens in logs or chat.
- Do not claim the allowlist launch is complete until authenticated and denied production paths both pass.
- Preserve the 83-file/88,422-row baseline and the analytics semantics in the operator skill.
- Prefer a quick human dashboard action or ignored-file credential handoff over elaborate credential-recovery workarounds.

## Useful first commands

```powershell
git status --short
git log -1 --oneline
pnpm test
pnpm lint
pnpm typecheck
pnpm db:status
pnpm db:reconcile
pnpm smoke:motherduck
vercel env ls production
vercel logs duckdive.gold --since 15m --no-follow
```

Do not run `pnpm preflight` expecting success until the missing local `MOTHERDUCK_SHARE_URL` is supplied. AI preflight now accepts the verified Vercel OIDC token.
