# Security policy

## Repository status

DuckDive is an engineering-review case study, not a production-supported service. The credential-free reviewer path is the supported inspection surface. Historical deployment code and operator commands remain in the repository as implementation evidence but are not evidence of a currently available service.

## Report a vulnerability

Use [GitHub's private vulnerability reporting form](https://github.com/Big-jpg/vic-house-data-lab/security/advisories/new) when it is available to you. If private reporting is unavailable, contact the repository owner without including credentials, private data, or exploit details in a public issue.

Include:

- the affected file, route, or workflow;
- the security boundary you believe can be crossed;
- minimal reproduction steps using synthetic data; and
- the likely impact.

Do not test against a live deployment, MotherDuck organization, Neon database, Blob store, vehicle source, or third-party account without separate written authorization.

## Data and credential boundaries

- Never commit `.env*`, access tokens, database URLs, share URLs, raw acquisition payloads, or unredacted listing identifiers.
- Use only the sanitized fixtures and public derivatives for reproduction.
- Keep browser access behind authenticated server routes; server credentials must never be exposed to client code.
- Treat acquisition, deployment, credential changes, external resource creation, and data mutation as separately authorized operations.
- Do not weaken workspace ownership, capability allowlists, attempt budgets, report-policy validation, or version checks to demonstrate an issue.

Run `corepack pnpm review:security` before proposing a change. The automated scan is a guardrail, not a substitute for human review or a dedicated security assessment.

## Disclosure and licensing

Please allow the owner reasonable time to investigate before public disclosure. Reporting a vulnerability does not grant permission to access systems or data and does not change the repository's [no-license status](LICENSE_STATUS.md).
