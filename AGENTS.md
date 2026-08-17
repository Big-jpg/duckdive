# Repository Agent Rules

For production setup, deployment, credentials, Neon, Vercel Blob, MotherDuck, Embedded Dives, ingestion, analytics semantics, or incident response, use `.agents/skills/vic-house-platform-operator/SKILL.md`.

At the start of a fresh agent session, read `NEXT_SESSION_HANDOFF.md`. Treat it as a concise orientation, not a phase plan or live telemetry. Reverify facts that matter to the requested work.

Start from the user-visible outcome. Existing schemas, routes, adapters, and phase labels are implementation history, not constraints. Prefer the smallest end-to-end product change that can be evaluated by an owner. Do not require a generalized schema abstraction or infrastructure proof before building a useful slice unless the requested behavior actually depends on one.

Validate in proportion to the change. Use focused checks while iterating; reserve full reconciliation and release evidence for changes that affect production, data, ownership, or external resources.

Never commit or print credentials. Vercel Sensitive values appear locally as `[SENSITIVE]`; ask the human for a direct dashboard-to-local handoff when that is simpler. Keep browser access behind authenticated server routes, preserve workspace ownership, and keep the VIC estate isolated from unrelated workloads. External resource creation, credential changes, destructive data operations, and production deployment require explicit authorization.

## Windows package-manager execution

On Windows, Corepack resolves pnpm from outside the workspace at
`C:\Users\rossf\AppData\Local\node\corepack`.

Run every `corepack pnpm ...` command with required sandbox access on the
first attempt, using the narrowest applicable persistent command prefix.
Do not first run it in the workspace sandbox and wait for the predictable
Corepack `EPERM`.

Run pnpm validation commands sequentially. Parallel Corepack or Next.js
commands can contend for shared package-manager or build directories and
produce a separate class of `EPERM` failures.