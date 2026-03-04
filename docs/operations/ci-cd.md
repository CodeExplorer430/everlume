# CI/CD Runbook

## Pipelines

### 1) CI (`.github/workflows/ci.yml`)
Triggers on push and pull requests to `main`/`master`.

Checks:
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

This workflow should be configured as a required status check before merge.

### 2) Next.js Deployment (Vercel)
Vercel Git integration handles deployments:
- PRs -> Preview deployments
- Merges to production branch -> Production deployment

Required Vercel env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### 3) Cloudflare Worker Deployment (`.github/workflows/deploy-worker.yml`)
Triggers on changes under `workers/redirector/**` and manual dispatch.

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `WORKER_SUPABASE_URL`
- `WORKER_SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_FALLBACK_URL`

## Rollback

### Next.js
1. Open Vercel dashboard.
2. Select a previous successful deployment.
3. Promote/Redeploy.

### Worker
1. Check previous successful commit touching `workers/redirector`.
2. Re-run the deploy workflow for that commit, or revert and redeploy.

## Branch Protection
Recommended for `main`:
- Require PR reviews.
- Require `CI / build` status check.
- Restrict direct pushes.
