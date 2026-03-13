# ISO/IEC 25010 Quality Model Mapping

This document maps the current implementation to the ISO/IEC 25010 quality
characteristics and highlights the main remaining gaps.

| Characteristic         | Current evidence                                                                                                         | Current gap focus                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Functional suitability | Public/admin flows are implemented and heavily tested.                                                                   | Continue tracking optional UX enhancements separately from compliance work.      |
| Performance efficiency | Lighthouse CI budgets, Next production builds, and service SLO targets are documented.                                   | Keep SLO evidence collection current.                                            |
| Compatibility          | Webpack and Turbopack coverage exist; worker and app integrations are documented.                                        | Continue validating external service compatibility during dependency waves.      |
| Usability              | Public and admin flows are tested; skip link and accessibility lane exist.                                               | Add explicit accessibility statement and manual assistive-tech validation notes. |
| Reliability            | Backup workflows, restore drills, incident SOP, launch-readiness checks, and retention policy exist.                     | Add explicit RTO/RPO targets and retained evidence review notes.                 |
| Security               | Admin RBAC, audit logs, anti-abuse controls, private media signing, security headers, and origin checks are implemented. | Keep SAST/SCA evidence and key-rotation guidance current.                        |
| Maintainability        | High unit coverage, mirrored tests, and documented branch governance exist.                                              | Add formal traceability and standards-oriented QA records.                       |
| Portability            | Next/Vercel app, Cloudflare worker, and Cloud Run transcode service are documented.                                      | Keep deployment contracts versioned and verify environment parity regularly.     |

## Immediate Improvement Priorities

1. Formal threat model and misuse-case review
2. Explicit key rotation guidance for signing and service secrets
3. Manual accessibility statement and assistive-tech evidence
