# Maintenance Schedule

Operational cadence for family admins.

## Weekly

- Verify critical routes open on mobile (`/`, one memorial, one short link).
- Review guestbook moderation queue.
- Confirm active short links still point to valid targets.
- Check latest backup workflow runs in GitHub Actions.
- Review current production alerts / failed health signals against the SLO doc.

## Monthly

- Export the memorial archive package and verify recent guestbook/photo exports.
- Review user access list (`Admin -> Users`) and deactivate unused accounts.
- Re-verify at least one printed QR code in real camera conditions.

## Quarterly

- Run restore drill (or review scheduled restore drill result artifact).
- Perform QR health sweep for all production plaque codes.
- Review incident log and unresolved risks.
- Review consent-log and admin-audit retention windows against policy.

## Annually

- Rotate all platform API keys/secrets.
- Validate account recovery methods and MFA backups.
- Review access modes for all memorials.

## Escalation Triggers

- Short-link failures > 5 minutes.
- Guestbook spam surge.
- Unauthorized access signs.
- Backup workflow failure for 2 consecutive runs.

Escalate using the incident SOP in `docs/handover/incident-and-rollback-sop.md`.
