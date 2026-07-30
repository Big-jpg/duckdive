# Next Session Handoff

Last verified: 2026-07-30 (Australia/Perth)

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
- Handoff base commit: `50827f591f71271a14a54f9848702a88ebf42214`
- Commit subject: `Add unlisted Dive sharing and strengthen production smoke checks`
- Working tree was clean immediately before this handoff file was added.
- Vercel project: `big-team/vic-house-data-lab`
- Canonical production URL: `https://vic-house-data-lab.vercel.app`
- Latest verified deployment: `dpl_8B8MYXXfc7HEQuNoa3wB5hFHuECs`
- Neon project shown by the user: `neon-vic-house-data`; keep it isolated from WA or unrelated estates.
- Migration `009_dive_shares.sql` is applied in production Neon.
- There were zero real rows in `app.app_user` and zero workspaces after the share smoke cleanup. Do not assume this remains true; query counts before an auth migration.

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

Vercel Production and Preview contain the Neon integration variables, `MOTHERDUCK_TOKEN`, `MOTHERDUCK_SHARE_URL`, `AUTH_SECRET`, `INGEST_SECRET`, Blob integration variables, estate variables, and MotherDuck endpoint selectors.

Known missing capability variables:

- No `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AI_GATEWAY_API_KEY` was configured. AI remixing is not a completed release gate even though model-name selectors exist.
- Neon Auth has not been provisioned/configured. `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` were absent from Vercel at handoff.
- Resend has not been configured. `RESEND_API_KEY`, sending domain/from address, and any Neon Auth webhook secret were absent.

Local credential posture:

- `.env.local`, `.env.blob`, and `.vercel` are ignored.
- Local Neon URLs and a MotherDuck operator token were usable at handoff. Inspect only presence/placeholder state; never print values.
- Vercel Sensitive variables pull locally as literal `[SENSITIVE]`; ask the human for a direct dashboard-to-ignored-file handoff when needed.

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

Configure one supported provider key, copy it to Vercel as Sensitive, run `pnpm preflight`, then exercise `/api/chat` through an authenticated personal workspace. Model-name environment variables alone are not credentials.

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
vercel logs vic-house-data-lab.vercel.app --since 15m --no-follow
```

Do not run `pnpm preflight` expecting success until an AI provider key and the future Neon Auth variables are intentionally reflected in its contract.
