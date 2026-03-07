# Everlume

A full-stack web app for creating, managing, and sharing memorial pages with QR-friendly short links.

## Core Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Hosting:** Vercel (Git integration)
- **Database/Auth:** Supabase (Postgres + Auth)
- **Image Storage/CDN:** Cloudinary (Upload Widget + URL transformations)
- **Video:** YouTube Unlisted (required for large files)
- **Short Links/DNS:** Cloudflare Workers + Cloudflare DNS

## Features
- Authenticated admin dashboard for managing memorial pages
- Cloudinary bulk photo upload and optimized gallery rendering
- YouTube video embedding workflow in admin/public pages
- Timeline editor and moderated guestbook
- QR code generation with short-link support
- CSV/ZIP export tools for guestbook and media metadata

## Local Setup

### 1) Install
```bash
nvm use
npm install
```

Recommended runtime: Node.js 22 LTS (see `.nvmrc`).

### 2) Environment variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
NEXT_PUBLIC_SHORT_DOMAIN=https://go.yourdomain.com
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # legacy fallback
VIDEO_TRANSCODE_API_BASE=https://your-cloud-run-service.run.app
VIDEO_TRANSCODE_API_TOKEN=shared_service_token
VIDEO_TRANSCODE_CALLBACK_TOKEN=shared_callback_token
PRIVATE_MEDIA_TOKEN_SECRET=long_random_secret
RATE_LIMIT_BACKEND=memory # or upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CAPTCHA_ENABLED=0
CAPTCHA_SECRET=
CAPTCHA_VERIFY_URL=
```

### 3) Database migrations
Run SQL migrations in order from `supabase/migrations/`:
- `20251227000000_initial_schema.sql`
- `20251227000001_storage_setup.sql` (legacy)
- `20260304000000_cloudinary_photo_fields.sql`
- `20260305000100_user_management_and_redirect_delete_policy.sql`
- `20260306000100_admin_audit_logs_and_photo_timestamps.sql`
- `20260306000200_rls_security_hardening.sql`
- `20260306000300_redirect_launch_readiness.sql`
- `20260306000400_access_mode_pwa_and_site_settings.sql`
- `20260306000500_media_optimization_runs.sql`
- `20260307000100_profiles_full_name_normalization.sql`

Hosted migration workflow (recommended):
```bash
supabase login
npm run ops:supabase:migrate:hosted -- <your-project-ref>
npm run ops:check-db-schema
```

If admin pages show `Your account does not have admin access.`, bootstrap your current login as admin:
```bash
NEXT_PUBLIC_SUPABASE_URL=... \
SUPABASE_SECRET_KEY=... \
npm run ops:supabase:bootstrap-admin -- --email=you@example.com --full-name="Your Name"
```

If bootstrap warns about legacy `profiles.name`, migrations are missing on that project. Re-run:
```bash
npm run ops:supabase:migrate:hosted -- <your-project-ref>
```

Local parity workflow:
```bash
supabase start
supabase db reset
```

## Run and Validate
```bash
npm run dev
npm run dev:webpack
npm run ops:check-prereqs
npm run ops:check-prereqs:production
npm run lint
npm run typecheck
npm run build
```

`ops:*` scripts automatically read `.env` and `.env.local` (shell-provided environment variables still take precedence).

## Testing
```bash
npm run test:unit
npm run test:worker
npm run test:coverage
npm run test:e2e:install
npm run test:e2e
npm run test:launch-readiness
npm run test:perf
```

If Turbopack-specific local issues appear in e2e startup, use:
```bash
npm run test:e2e:turbopack
npm run test:e2e:webpack
```

`npm run test:e2e` uses webpack-backed Next dev by default for stability in this environment. Use `npm run test:e2e:turbopack` only for Turbopack diagnostics.

Coverage gates are currently enforced at 10% global thresholds in CI.

## CI/CD
- **GitHub Actions CI:** lint, typecheck, unit coverage, worker tests, e2e (webpack + turbopack required), a11y, launch-readiness, Lighthouse perf/a11y gate, and build on PRs/pushes (`.github/workflows/ci.yml`)
- **Vercel deploys:** previews on PRs and production on merge to main branch
- **Cloudflare Worker deploy:** `.github/workflows/deploy-worker.yml`
- **Cloudinary prewarm (optional):** `.github/workflows/prewarm-media.yml`
- **Video transcode service:** deploy `services/video-transcode` to Cloud Run (see `services/video-transcode/README.md`).

Operational docs:
- `docs/operations/ci-cd.md`
- `docs/operations/backups.md`
- `docs/operations/media-policy.md`
- `docs/operations/short-links.md`
- `docs/operations/predeploy-checklist.md`
- `docs/operations/qr-launch-checklist.md`
- `docs/operations/maintenance-schedule.md`
- `docs/handover/family-admin-playbook.md`
- `docs/handover/access-transfer-checklist.md`
- `docs/handover/incident-and-rollback-sop.md`
- `docs/handover/training-packet.md`
- `docs/testing-strategy.md`
- `docs/repo-governance.md`

## Video Upload Policy
For large files, admins can now use the **Upload and Compress** flow:
- Select local video in admin.
- App initializes upload with the transcode service.
- Service compresses and targets <=100MB for Cloudinary free tier.
- On success, compressed Cloudinary video can be attached to the page.

Fallback policy: if compression cannot get under 100MB with acceptable settings, use YouTube Unlisted and paste the URL in the YouTube form.

Cloud Run contract readiness check:
```bash
npm run ops:check-video-transcode
```

## Security Notes
- Admin APIs enforce role-based access (`viewer`, `editor`, `admin`).
- Admin write actions are recorded in `admin_audit_logs`.
- Private memorial photos are served through short-lived signed proxy URLs.
- Guestbook endpoint requires durable rate limiting (`upstash`) and CAPTCHA in production.
