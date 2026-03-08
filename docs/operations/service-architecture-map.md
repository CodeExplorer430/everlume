# Service Architecture Map

Use this as the single source of truth for external services used by Everlume.

## 1) Runtime Architecture (at a glance)
- Browser -> Vercel (Next.js app + `/api/*`) -> Supabase (Auth + Postgres)
- Browser -> Cloudinary Upload Widget -> Cloudinary -> app API stores metadata in Supabase
- Browser -> app upload API -> Cloud Run transcode service -> Cloudinary video -> app callback -> Supabase
- QR short link -> Cloudflare Worker -> Supabase `redirects` lookup -> destination URL

## 2) Service Inventory

### Core required for launch
- **Vercel**
  - Purpose: host Next.js frontend + API routes.
  - Critical env: `NEXT_PUBLIC_*`, Supabase keys, security envs.
- **Supabase**
  - Purpose: database + auth + RLS.
  - Critical objects: `pages`, `photos`, `videos`, `redirects`, `video_upload_jobs`, `profiles`, `admin_audit_logs`.
- **Cloudinary**
  - Purpose: media storage/delivery (images + compressed videos).
  - Critical config:
    - unsigned upload preset for image widget,
    - API credentials for server-side video transcode upload.
- **Cloudflare DNS + Worker (`everlume-redirector`)**
  - Purpose: stable short-domain redirects for QR plaques.
  - Critical secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FALLBACK_URL`.
- **GitHub Actions**
  - Purpose: CI quality gates + deployment automation.

### Required by current production security gate
- **Upstash Redis**
  - Purpose: durable rate limiting (`RATE_LIMIT_BACKEND=upstash`).
- **CAPTCHA provider**
  - Purpose: bot/spam prevention for public submission flows.

### Required for direct in-app video compression uploads
- **Cloud Run video transcode service**
  - Purpose: receives upload, runs ffmpeg compression, uploads to Cloudinary, callbacks app.
  - Contract:
    - `POST /jobs/init`
    - `POST /jobs/:id/start`
    - callback to app `/api/internal/video-transcode/callback`
  - Source location: `services/video-transcode`.

### Fallback/operational services
- **YouTube Unlisted**
  - Purpose: fallback video path when compressed output cannot stay under Cloudinary free-tier cap.
- **Cloudflare R2** (if backup workflows are enabled)
  - Purpose: store automated DB backups.
- **Google Drive**
  - Purpose: family-owned backup of original media masters.

## 3) Ownership & Access Checklist
For each external service, track:
- owner account email
- backup owner email
- MFA enabled (`yes/no`)
- recovery codes stored (`yes/no`)
- last credential rotation date

Minimum owner accounts to keep active:
- GitHub repo admin
- Vercel project admin
- Supabase project admin
- Cloudinary admin
- Cloudflare account admin
- GCP project admin (for Cloud Run transcode service)

## 4) Environment Variable Mapping

### App (Vercel / local)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY`
- Media:
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
  - `VIDEO_TRANSCODE_API_BASE`
  - `VIDEO_TRANSCODE_API_TOKEN`
  - `VIDEO_TRANSCODE_CALLBACK_TOKEN`
  - `VIDEO_TRANSCODE_APP_BASE`
- Short links: `NEXT_PUBLIC_SHORT_DOMAIN`
- Security: `RATE_LIMIT_BACKEND`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CAPTCHA_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CAPTCHA_SECRET`, `CAPTCHA_VERIFY_URL`
- Private media signing: `PRIVATE_MEDIA_TOKEN_SECRET`

### Cloudflare Worker
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `FALLBACK_URL`

### Cloud Run transcode service
- `VIDEO_TRANSCODE_API_TOKEN`
- `VIDEO_TRANSCODE_CALLBACK_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 5) Operational Verification Commands
- Prereqs:
  - `npm run ops:check-prereqs`
  - `npm run ops:check-prereqs:production`
- DB schema:
  - `npm run ops:check-db-schema`
- Transcode contract:
  - `npm run ops:check-video-transcode`
  - `npm run ops:check-video-transcode:synthetic`
- Quality gates:
  - `npm run test:coverage`
  - `npm run test:e2e`
  - `npm run test:e2e:auth`
  - `npm run test:launch-readiness`
