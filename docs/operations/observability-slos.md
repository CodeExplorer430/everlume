# Observability And Service Objectives

This document defines the minimum operational signals, owners, and target
service objectives for the production system.

## Service Signals

| Surface                           | Primary signal                                           | Supporting signals                                                | Primary owner |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- | ------------- |
| Public memorial pages             | Successful page load and memorial render                 | Vercel deployment health, Lighthouse smoke, incident log          | Operator      |
| Short links / QR redirects        | Successful `/r/:code` redirect and worker build health   | Cloudflare worker deploy status, launch-readiness checks          | Operator      |
| Guestbook submission              | Successful accepted submission flow (`201/202`)          | Rate-limit/CAPTCHA errors, moderation queue review                | Operator      |
| Admin auth and admin reads/writes | Successful admin sign-in and `/api/admin/*` route health | Supabase auth health, audit-log continuity, user-management smoke | Operator      |
| Backup / restore readiness        | Backup workflow success and restore-drill success        | Artifact presence, checksum/manifests, maintenance review         | Operator      |

## Target SLOs

| Surface                                     | SLI                                                             | Target                    |
| ------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| Public memorial delivery                    | Successful availability of key memorial pages                   | 99.9% monthly             |
| Short-link resolution                       | Successful redirect responses for active QR/short links         | 99.95% monthly            |
| Guestbook acceptance                        | Successful non-abusive guestbook submission handling            | 99.0% monthly             |
| Admin authentication and admin route access | Successful admin sign-in and critical admin screen availability | 99.5% monthly             |
| Backup and restore readiness                | Successful scheduled backups and quarterly restore drills       | 100% scheduled completion |

## Alert And Escalation Expectations

- Trigger a SEV-1 incident when public memorials or short links are broadly
  unavailable for more than 5 minutes.
- Trigger a SEV-2 incident when guestbook submissions or admin access are
  consistently failing for more than 15 minutes.
- Treat any backup failure for 2 consecutive scheduled runs as an escalation
  event.
- Record every production incident in the incident and rollback SOP template.

## Current Signal Sources

- GitHub Actions workflows:
  - `launch_readiness`
  - `perf_a11y_gate`
  - backup and restore drill workflows
  - worker tests / worker deploy checks
- Platform surfaces:
  - Vercel deployment status
  - Cloudflare Worker Builds / deployment history
  - Supabase project health and auth/database status
- Application-level evidence:
  - admin audit logs
  - guestbook moderation queue
  - incident notes and rollback records

## Review Cadence

- Weekly: review public route, short-link, and backup health signals.
- Monthly: review guestbook/admin operational health and unresolved alerts.
- Quarterly: review restore-drill evidence, SLO misses, and alert ownership.
