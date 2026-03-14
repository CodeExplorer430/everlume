# OWASP Top 10 Assessment

This document records the current repository posture against the OWASP Top 10.

| Risk                                           | Status      | Current evidence                                                                                                  | Remaining action                                                                        |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A01 Broken Access Control                      | Implemented | Admin RBAC, owner checks, private/password access helpers, media consent and token checks                         | Keep route tests current when access rules change                                       |
| A02 Cryptographic Failures                     | Implemented | Signed media/password/consent tokens, environment-gated secrets, retention policy, and key rotation runbook exist | Keep rotation evidence current                                                          |
| A03 Injection                                  | Implemented | Supabase query builder usage, Zod validation, no raw SQL in request paths                                         | Keep validation coverage aligned with new endpoints                                     |
| A04 Insecure Design                            | Implemented | Requirements matrix, runbooks, launch-readiness checks, and formal threat model exist                             | Keep misuse-case review updated when trust boundaries change                            |
| A05 Security Misconfiguration                  | Implemented | Production prereq gates, worker prereq gates, browser security headers                                            | Keep external service config drift checks current                                       |
| A06 Vulnerable and Outdated Components         | Partial     | Dependabot usage and disciplined dependency waves exist                                                           | CI lacked formal SCA/SBOM evidence before this pass; workflows now add it               |
| A07 Identification and Authentication Failures | Implemented | Supabase auth, fake-auth isolation for tests, account activation checks                                           | Continue testing password/reset and deactivated-account paths                           |
| A08 Software and Data Integrity Failures       | Partial     | CI gates, protected branches, signed worker/app deployments                                                       | Add SBOM generation and maintain dependency review enforcement                          |
| A09 Security Logging and Monitoring Failures   | Implemented | Admin audit logs, incident SOP, retention policy, observability/SLO docs, and webhook alert delivery exist        | Periodically verify alert webhook health and ownership                                  |
| A10 Server-Side Request Forgery                | Partial     | External endpoints are narrow and env-gated                                                                       | Document approved outbound integrations and review callback/URL allowlists periodically |

## Current Security Decisions

- Admin mutations remain protected by auth + RBAC + owner checks + audit logs.
- Browser-originated admin mutations now validate `Origin` / `Referer` against
  trusted same-origin app hosts before writes are accepted.
- Public anti-abuse posture in production requires durable rate limiting and
  CAPTCHA.
- Browser hardening is enforced through a global header policy with CSP,
  referrer, permissions, HSTS, and framing restrictions.
- Threats and misuse cases are documented in `docs/security/threat-model.md`.
- ESLint 10 remains deferred and documented separately; it is not a current
  security blocker.

## Next Security Review Items

- explicit RTO/RPO evidence alignment for backup/restore operations
- manual accessibility evidence and operator review records
- periodic secret rotation evidence review
