# Key Rotation Procedure

Use this runbook when rotating signing secrets, service credentials, or
deployment tokens.

## Rotation Triggers

- scheduled quarterly review of sensitive credentials
- ownership transfer or collaborator offboarding
- suspected leak, phishing event, or device compromise
- upstream provider incident or forced token invalidation

## Secret Inventory

| Secret group                       | Examples                                                                                                    | Owner            | Rotation trigger                               | Verification after rotation                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| App signing secrets                | `PRIVATE_MEDIA_TOKEN_SECRET`, `PAGE_ACCESS_TOKEN_SECRET`, consent/password signing secrets                  | Operator / owner | Transfer, suspected leak, annual planned roll  | private media, password access, and consent flows still validate |
| Supabase privileged credentials    | `SUPABASE_SECRET_KEY`, legacy `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_SUPABASE_SECRET_KEY`                     | Operator         | Transfer, incident, provider rotation          | admin user routes, worker redirect lookup, backup scripts pass   |
| Cloudflare deployment credentials  | `CLOUDFLARE_API_TOKEN`, Worker Builds token, `CLOUDFLARE_ACCOUNT_ID`                                        | Operator         | Transfer, build failure, provider rotation     | worker deploy and PR worker builds succeed                       |
| Vercel / GitHub automation secrets | repo/project deploy tokens, `OPS_ALERT_WEBHOOK_URL`                                                         | Operator         | Transfer, alert endpoint change, secret review | GitHub CI, preview/build hooks, webhook alert test succeed       |
| Anti-abuse / infra credentials     | `UPSTASH_REDIS_REST_TOKEN`, `CAPTCHA_SECRET`, `VIDEO_TRANSCODE_API_TOKEN`, `VIDEO_TRANSCODE_CALLBACK_TOKEN` | Operator         | Transfer, abuse incident, provider rotation    | guestbook flow, transcode contract checks, prereq gates pass     |

## Standard Rotation Procedure

1. Record the reason for rotation and the target secret group in the incident
   log or maintenance record.
2. Create the replacement secret/token in the provider first.
3. Update the secret in every dependent system before invalidating the old one:
   - GitHub Actions secrets/variables
   - Vercel project env
   - Cloudflare Worker / Worker Builds config
   - local operator password manager or secret store
4. Run the verification checks for the rotated group.
5. Invalidate the previous token/secret.
6. Record the completion date, operator, and verification evidence.

## Group-Specific Verification

### App signing secrets

- `npm run test:coverage`
- validate one password-protected memorial flow
- validate one protected-media consent flow

### Supabase privileged credentials

- `npm run ops:check-prereqs:production`
- `npm run ops:check-worker-prereqs`
- verify admin user management and short-link worker health

### Cloudflare deployment credentials

- rerun worker deploy workflow
- verify PR Worker Builds and production worker deploy both succeed
- validate one `/r/:code` redirect

### Vercel / GitHub automation / alerting

- rerun a harmless GitHub Actions workflow or dispatch workflow
- confirm `OPS_ALERT_WEBHOOK_URL` receives a test or next failure notification
- verify preview/build hooks still succeed

### Anti-abuse / infrastructure credentials

- `npm run ops:check-prereqs:production`
- validate guestbook submit flow and CAPTCHA health
- validate transcode contract checks if transcode tokens were rotated

## Recording Requirements

Always record:

- date/time
- operator
- secret group rotated
- systems updated
- verification performed
- old credential revocation confirmed

Keep the record with incident notes, maintenance logs, or access-transfer
evidence for at least the retention window defined in
`docs/security/data-retention-policy.md`.
