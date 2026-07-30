# Repository Agent Rules

For production setup, deployment, credentials, Neon, Vercel Blob, MotherDuck, Embedded Dives, ingestion, analytics semantics, or incident response, use `.agents/skills/vic-house-platform-operator/SKILL.md`.

At the start of a fresh agent session, read `NEXT_SESSION_HANDOFF.md` before making changes. It records the last verified production state, completed migrations, deferred credentials, and the allowlisted Neon Auth/Resend continuation design. Reverify time-sensitive facts rather than treating the handoff as live telemetry.

Never commit or print credentials. Vercel Sensitive values appear locally as `[SENSITIVE]`; ask the human for a direct dashboard-to-local handoff when that is simpler. Keep the VIC estate isolated, preserve the immutable 83-file baseline, and require full reconciliation plus live API/embed smoke tests before declaring success.
