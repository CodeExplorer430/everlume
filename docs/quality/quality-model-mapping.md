# ISO/IEC 25010 Quality Model Mapping

This document maps the current implementation to the ISO/IEC 25010 quality
characteristics and highlights the main remaining gaps.

| Characteristic         | Current evidence                                                                                                             | Current gap focus                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Functional suitability | Public/admin flows are implemented and heavily tested.                                                                       | Continue tracking optional UX enhancements separately from compliance work.      |
| Performance efficiency | Lighthouse CI budgets, Next production builds, and service SLO targets are documented.                                       | Keep SLO evidence collection current.                                            |
| Compatibility          | Webpack and Turbopack coverage exist; worker and app integrations are documented.                                            | Continue validating external service compatibility during dependency waves.      |
| Usability              | Public and admin flows are tested; skip link and accessibility lane exist.                                                   | Add explicit accessibility statement and manual assistive-tech validation notes. |
| Reliability            | Backup workflows, restore drills, incident SOP, launch-readiness checks, retention policy, and webhook alerts exist.         | Add explicit RTO/RPO targets and retained evidence review notes.                 |
| Security               | Admin RBAC, audit logs, anti-abuse controls, private media signing, security headers, origin checks, and threat model exist. | Keep SAST/SCA evidence and rotation records current.                             |
| Maintainability        | High unit coverage, mirrored tests, and documented branch governance exist.                                                  | Add formal traceability and standards-oriented QA records.                       |
| Portability            | Next/Vercel app, Cloudflare worker, and Cloud Run transcode service are documented.                                          | Keep deployment contracts versioned and verify environment parity regularly.     |

## Immediate Improvement Priorities

1. Explicit RTO/RPO targets with retained evidence review
2. Manual accessibility statement and assistive-tech evidence
3. Periodic verification that alert delivery and secret rotation records remain current
