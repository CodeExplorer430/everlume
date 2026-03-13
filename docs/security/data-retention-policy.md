# Data Retention Policy

This policy defines the expected retention and deletion handling for the
Everlume production system.

## Primary Memorial Content

| Data class                         | Default retention                                      | Deletion path                                            | Notes                                                                    |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Memorial records (`pages`)         | Retain for the memorial lifetime                       | Delete only by explicit family/operator request          | Core product record                                                      |
| Photos / videos / timeline entries | Retain for the memorial lifetime                       | Delete through admin UI or memorial removal              | Treated as primary memorial content                                      |
| Guestbook entries                  | Retain for the memorial lifetime unless removed sooner | Family admins may unapprove or delete individual entries | Moderation removals should happen as soon as content is no longer wanted |

## Oversight And Security Records

| Data class                                             | Default retention | Review cadence   | Notes                                                                          |
| ------------------------------------------------------ | ----------------- | ---------------- | ------------------------------------------------------------------------------ |
| Protected media consent logs (`media_access_consents`) | 24 months         | Quarterly review | Preserve enough history for family oversight while limiting indefinite storage |
| Admin audit logs (`admin_audit_logs`)                  | 24 months         | Quarterly review | Retain operational accountability for privileged actions                       |
| Incident notes / rollback records                      | 12 months minimum | Quarterly review | Extend longer if an unresolved incident, dispute, or legal hold exists         |

## Backup And Recovery Artifacts

| Artifact                       | Default retention                 | Source of truth                                     |
| ------------------------------ | --------------------------------- | --------------------------------------------------- |
| Daily database backups         | 30 days                           | `docs/operations/backups.md` and workflow variables |
| Weekly database backups        | 12 weeks                          | `docs/operations/backups.md` and workflow variables |
| Restore-drill reports          | 12 months                         | GitHub Actions artifacts / operator archive         |
| Backup manifests and checksums | Match the backup object lifecycle | Keep with the related backup object                 |

## Deletion And Exception Rules

- Family-requested memorial removal takes priority over the default memorial
  lifetime retention.
- Security, incident, or legal-hold investigations may extend retention beyond
  the default window until the hold is explicitly cleared.
- When deleting oversight/security records, remove the oldest records first and
  preserve enough recent history to satisfy the windows above.
- Automation is preferred for backup lifecycle; consent and audit-log cleanup is
  currently an operator-run review task and should be recorded in the
  maintenance log.

## Operational Review Checklist

- Weekly: verify backup workflows are succeeding.
- Quarterly: review consent-log and audit-log age, confirm the oldest retained
  records still fall within policy, and archive/trim if needed.
- Annually: review whether the retention windows still match family, legal, and
  operational expectations.
