# Threat Model And Misuse Cases

This document records the primary trust boundaries, abuse paths, and controls
for Everlume's production system.

## Protected Assets

- memorial content and admin-managed memorial state
- private/password-protected memorial access decisions
- protected media URLs, consent logs, and signing secrets
- guestbook integrity and anti-abuse controls
- short-link routing integrity
- backup artifacts and restore credentials
- CI/CD and worker deployment credentials

## Trust Boundaries

| Boundary                    | Entry points / surfaces                                             | Primary controls                                                                        |
| --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Public browser -> app       | `/memorials/[slug]`, `/api/public/*`, `/api/guestbook`, `/r/[code]` | Zod validation, consent/private-media tokens, rate limiting, CAPTCHA, redirect checks   |
| Admin browser -> app        | `/admin`, `/api/admin/*`                                            | Supabase auth, RBAC, owner checks, audit logs, browser-origin validation on mutations   |
| App -> external providers   | Supabase, Cloudinary, Cloudflare Worker, Vercel, transcode service  | Env-gated credentials, prereq gates, signed tokens, worker/app contract checks          |
| CI/CD -> production systems | GitHub Actions, Vercel, Cloudflare Worker deploys, backup workflows | Protected branches, required checks, scoped tokens, CodeQL, dependency review, SBOM     |
| Backup/restore operations   | R2 bucket, restore drill workflows, manual rollback steps           | Scheduled workflows, manifests/checksums, restore drills, incident SOP, retention rules |

## Primary Misuse Cases

| Threat / misuse case                       | Primary impact                         | Current mitigations                                                                | Residual note                                           |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Cross-origin admin mutation attempt        | Unauthorized memorial/user changes     | Session auth, RBAC, owner checks, explicit `Origin` / `Referer` validation, audits | Keep route coverage current                             |
| Stolen admin session in a trusted browser  | Privileged reads/writes                | Supabase auth, active-state checks, role checks, audit logging                     | MFA and account hygiene remain operational controls     |
| Guestbook spam or abuse flood              | Content abuse, moderation overhead     | CAPTCHA, rate limiting, moderation approvals, incident SOP                         | Production operator must keep anti-abuse env configured |
| Media token leakage or consent bypass      | Protected media disclosure             | Signed media/consent/password tokens, versioned consent cookies, short expiry      | Rotate signing secrets after suspected compromise       |
| Redirect tampering or QR misroute          | Visitor misdirection                   | Admin owner checks, worker tests, launch-readiness smoke, worker build controls    | Review short-link changes during weekly ops review      |
| Backup artifact exposure or misuse         | Data disclosure or destructive restore | R2-scoped credentials, retention policy, restore drill evidence, incident SOP      | Rotation and access review remain operational tasks     |
| CI token or worker deploy token compromise | Unauthorized deploys or config changes | Protected branches, scoped tokens, CodeQL/dependency review/SBOM, key rotation     | Rotate on transfer or suspicion and record evidence     |
| Dependency or supply-chain regression      | Runtime failure or vulnerable package  | Dependabot waves, CI suite, CodeQL, dependency review, SBOM                        | Major-version upgrades still require isolated review    |

## Accepted Residual Risks

- Manual accessibility evidence is still maintained outside an automated
  standards artifact and should be captured in a later quality wave.
- Alert delivery depends on the configured external webhook endpoint staying
  healthy; workflow failures are still visible in GitHub even if webhook
  delivery fails.
- External platform compromise at Vercel/Cloudflare/Supabase is mitigated by
  provider controls, scoped credentials, and incident response rather than app
  code alone.
