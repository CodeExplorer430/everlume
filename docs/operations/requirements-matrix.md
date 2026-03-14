# Requirements Matrix

This document records the current audit status of the repository's major product and operational requirements.

## Functional Requirements

| Area                                                         | Status      | Verification                                                                              |
| ------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------- |
| Public memorial page rendering (`/memorials/[slug]`)         | Implemented | Unit coverage plus Playwright public memorial flow                                        |
| Private/password memorial access control                     | Implemented | Unit coverage for page access/password helpers plus Playwright password/private flows     |
| Guestbook submission, validation, CAPTCHA, and rate limiting | Implemented | Unit route/component coverage for happy/error/rate-limit/CAPTCHA paths                    |
| Protected media consent flow                                 | Implemented | Unit coverage for public consent gate, admin consent endpoints, and private media helpers |
| Short links and QR plaque routing                            | Implemented | Unit coverage for redirect routes plus launch-readiness Playwright smoke                  |
| Admin memorial CRUD                                          | Implemented | Unit route/component coverage plus Playwright memorial creation flow                      |
| Admin media management (photos, videos, timeline)            | Implemented | Unit route/component coverage plus Playwright video upload flow                           |
| Admin guestbook moderation                                   | Implemented | Unit route coverage plus Playwright moderation flow                                       |
| Admin user management and password setup/reset               | Implemented | Unit route/component coverage plus dedicated auth Playwright lane                         |
| Legacy `/pages/[slug]` redirect and fallback                 | Implemented | Unit coverage for redirect and not-found wrapper                                          |

## Non-Functional Requirements

| Area                                                 | Status      | Verification                                                              |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Server-side admin authorization boundary             | Implemented | Route tests mock role and active-state combinations                       |
| Admin mutation audit logging                         | Implemented | Route tests and `admin-audit` unit coverage                               |
| Browser security header policy                       | Implemented | Global Next header policy plus unit coverage for CSP and header set       |
| Static quality gates (`format`, `lint`, `typecheck`) | Implemented | Local and CI verification                                                 |
| Coverage threshold enforcement (85/85/85/75)         | Implemented | Vitest thresholds enforced in `vitest.config.ts`                          |
| Accessibility smoke coverage                         | Implemented | Playwright `@a11y` suite                                                  |
| Performance/accessibility budgets                    | Implemented | Lighthouse CI gate in `test:perf`                                         |
| Security scanning and dependency review              | Implemented | CodeQL and dependency review GitHub workflows                             |
| SBOM artifact generation                             | Implemented | Dedicated GitHub workflow generating SPDX artifact                        |
| Webpack e2e regression coverage                      | Implemented | Playwright baseline suite                                                 |
| Turbopack compatibility coverage                     | Diagnostic  | CI diagnostic lane with artifact upload, non-blocking by policy           |
| Local Playwright server reuse                        | Implemented | `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` support in config and port preflight |

## Operational Requirements

| Area                                      | Status      | Verification                                                         |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------- |
| Supabase schema and security migrations   | Implemented | Ordered migrations in `supabase/migrations/` and schema check script |
| Video transcode service contract          | Implemented | `services/video-transcode` plus contract/synthetic checks            |
| Backup automation and restore drill       | Implemented | GitHub workflows and `scripts/ops/*` backup tooling                  |
| Production env/security prerequisite gate | Implemented | `scripts/ops/check-deploy-prereqs.mjs` and workflow usage            |
| Worker redirect deployment path           | Implemented | Worker tests plus deployment workflow                                |
| Standards traceability and QA artifacts   | Implemented | `docs/quality/*` and `docs/security/owasp-top-10-assessment.md`      |

## Current Audit Notes

- Main quality gates currently pass when executed in a localhost-capable environment.
- Turbopack remains intentionally diagnostic rather than release-blocking.
- Security and governance follow-through now includes explicit browser-origin
  validation for admin mutations, a retention policy, and observability/SLO
  ownership docs.
- The formal threat model, key rotation runbook, and workflow alert delivery are
  now implemented.
- The largest remaining standards gaps are explicit RTO/RPO evidence alignment
  and documented manual accessibility review evidence.
- Branch and PR hygiene are tracked separately from this matrix; see repo governance and GitHub state for merge workflow decisions.
