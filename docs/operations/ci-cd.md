# CI/CD Runbook

## Pipelines

### 1) CI (`.github/workflows/ci.yml`)
Triggers on push and pull requests to `main`/`master`.

Checks:
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run test:e2e` (webpack baseline)
- `npm run test:e2e:turbopack` (required parity run)
- launch-readiness smoke (`/r/[code]` unit + short-links e2e flow)
- Lighthouse perf/a11y budget gate (`npm run test:perf`)
- `npm run build`

Build env note:
- CI build uses non-secret placeholder public env values (`NEXT_PUBLIC_*`) so prerender paths that touch Supabase SSR wrappers do not fail during `next build`.

Security/reliability note:
- Admin/public write flows are validated server-side via `/api/*` endpoints and are covered by unit route tests in CI.
- Admin media mutations (photo metadata create, caption update, and delete) are also API-only and route-tested.
- Admin client reads are also API-mediated (`/api/admin/*`) for a single trust boundary and explicit ownership checks.

This workflow should be configured as a required status check before merge.
Required statuses: `lint`, `typecheck`, `unit_coverage`, `worker_tests`, `e2e_webpack`, `e2e_turbopack`, `a11y`, `launch_readiness`, `perf_a11y_gate`, `build`.

### 2) Next.js Deployment (Vercel)
Vercel Git integration handles deployments:
- PRs -> Preview deployments
- Merges to production branch -> Production deployment

Required Vercel env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `RATE_LIMIT_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CAPTCHA_ENABLED=1`
- `CAPTCHA_SECRET`

Production preflight:
- Run `npm run ops:check-prereqs:production` before any production deployment.

### 3) Cloudflare Worker Deployment (`.github/workflows/deploy-worker.yml`)
Triggers on changes under `workers/redirector/**` and manual dispatch.

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `WORKER_SUPABASE_URL`
- `WORKER_SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_FALLBACK_URL`

### 4) DB Backup Automation (`.github/workflows/backup-db.yml`)
Automated DB backups to Cloudflare R2:
- Daily + weekly backup jobs.
- Retention pruning:
  - daily: 30 days
  - weekly: 12 weeks

Required GitHub secrets:
- `SUPABASE_DB_URL`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Optional repository variables:
- `BACKUP_PREFIX`
- `DAILY_RETENTION_DAYS`
- `WEEKLY_RETENTION_WEEKS`

### 5) Restore Drill (`.github/workflows/backup-restore-drill.yml`)
Quarterly restore verification:
- Downloads latest backup from R2.
- Restores into ephemeral Postgres service.
- Runs smoke checks on core tables.
- Uploads restore report artifact.

### 6) Media Prewarm (`.github/workflows/prewarm-media.yml`)
Optional scheduled Cloudinary transform prewarm:
- Weekly run + manual dispatch.
- Hits key widths for recently indexed photos.
- Writes run status records to `media_optimization_runs`.

Required secrets/vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `MEDIA_PREWARM_ENABLED` (repo variable, default `0`)
- `MEDIA_PREWARM_BATCH_SIZE` (repo variable, default `40`)

## Rollback

### Next.js
1. Open Vercel dashboard.
2. Select a previous successful deployment.
3. Promote/Redeploy.

### Worker
1. Check previous successful commit touching `workers/redirector`.
2. Re-run the deploy workflow for that commit, or revert and redeploy.

### Database
1. Locate target backup in R2.
2. Restore with `psql` into target DB.
3. Validate core tables and key row counts.
4. Re-run app smoke checks against restored environment.

## Branch Protection
Recommended for `main`:
- Require PR reviews.
- Require status checks: `lint`, `typecheck`, `unit_coverage`, `worker_tests`, `e2e_webpack`, `e2e_turbopack`, `a11y`, `launch_readiness`, `build`.
- Include `perf_a11y_gate` in required status checks for performance/accessibility enforcement.
- Restrict direct pushes.
