# Incident and Rollback SOP

Use this for production issues affecting family admins or public visitors.

## 1) Severity Levels
- **SEV-1**: Site unavailable, short links broken, or data loss risk.
- **SEV-2**: Major feature broken (guestbook moderation, media loading).
- **SEV-3**: Minor UI issue or intermittent non-critical error.

## 2) First 15 Minutes
1. Record timestamp and affected URLs.
2. Identify affected scope:
   - public pages,
   - admin pages,
   - redirects/QR flows,
   - media/CDN.
3. Apply immediate mitigation:
   - disable problematic short link,
   - revert latest deployment,
   - pause moderation actions if data mismatch is suspected.

## 3) Common Incident Playbooks

### A) Short Link Misroute
- Check redirect in `Admin -> Short Links`.
- Update target URL or reactivate link.
- Validate: `/r/:code` and worker short domain route.
- Re-test physical QR.

### B) Media Not Loading
- Check Cloudinary URL validity and public IDs.
- Validate memorial page photos table rows.
- Confirm Next image domain config still matches `res.cloudinary.com`.

### C) Guestbook Abuse Spike
- Tighten moderation (approve manually only).
- Enable CAPTCHA and durable rate-limit backend if not active.
- Remove abusive entries and monitor 24h.

### D) Admin Access Failure
- Verify Supabase auth status.
- Confirm user role/is_active in admin users.
- Use owner account to restore role.

## 4) Rollback Procedures

### Frontend (Vercel)
1. Open Vercel deployments.
2. Select last known-good deployment.
3. Promote/redeploy.
4. Re-test public memorial and admin login.

### Cloudflare Worker
1. Re-run worker deploy from last known-good commit.
2. Verify `go.<domain>/<code>` redirect behavior.

### Database
1. Locate latest healthy backup artifact.
2. Restore into target DB (or dry-run env first).
3. Validate core tables: `pages`, `photos`, `guestbook`, `redirects`.

## 5) Post-Incident Review Template
- Incident ID:
- Start/End time:
- Severity:
- User impact:
- Root cause:
- Mitigation applied:
- Rollback used:
- Follow-up actions:
- Owner + due date:
