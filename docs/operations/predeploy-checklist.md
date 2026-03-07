# Pre-Deploy Checklist (Cloudinary + Cloudflare)

Use this checklist before Vercel production deploy.

## 1) Cloudinary Upload Preset
Cloudinary Console -> Settings -> Upload -> Upload presets -> Add upload preset.

Use these values:
- Preset name: `everlume_unsigned_upload`
- Signing mode: `Unsigned`
- Asset folder: `everlume`
- Public ID mode: `Auto-generate unguessable public ID`
- Disallow public ID: off
- Optional allowed formats: `jpg,jpeg,png,webp,heic`

Then set:
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=everlume_unsigned_upload`

## 2) Cloudflare Worker + Short Domain
1. Deploy worker `everlume-redirector`.
2. Add route: `go.yourdomain.com/*` -> `everlume-redirector`.
3. Set worker secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
   - `FALLBACK_URL` (temporary public page until Vercel is live)
4. Set app env:
   - `NEXT_PUBLIC_SHORT_DOMAIN=https://go.yourdomain.com`

## 3) Redirect Smoke Test
Insert one row in `redirects` table:
- `shortcode`: `test`
- `target_url`: temporary public page or staging memorial URL

Check:
- `https://go.yourdomain.com/test` -> `302` to target.
- `https://go.yourdomain.com/unknown` -> `404`.
- `https://go.yourdomain.com/` -> `302` to fallback (if set).

Also verify app-side fallback:
- `https://app.yourdomain.com/r/unknown` -> `/r/not-found?reason=missing`.
- `https://app.yourdomain.com/r/test` -> `302` to target URL.

## 4) Video Transcode Service (Cloud Run)
Deploy the in-repo service before enabling direct video upload in production.

1. Build/deploy service:
```bash
./scripts/ops/deploy-video-transcode-cloud-run.sh everlume-video-transcode us-central1 <gcp-project-id>
```
2. Set Cloud Run env vars:
   - `VIDEO_TRANSCODE_API_TOKEN`
   - `VIDEO_TRANSCODE_CALLBACK_TOKEN`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Set app env vars:
   - `VIDEO_TRANSCODE_API_BASE=<cloud-run-url>`
   - `VIDEO_TRANSCODE_API_TOKEN=<same-as-service-token>`
   - `VIDEO_TRANSCODE_CALLBACK_TOKEN=<same-as-service-callback-token>`
4. Run contract check:
```bash
npm run ops:check-video-transcode
```

## 5) Local Validation
Run before deploy:
```bash
npm run ops:check-prereqs
npm run ops:check-prereqs:production
npm run ops:check-db-schema
npm run ops:check-video-transcode
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e:webpack
```

Production gate note:
- `ops:check-prereqs:production` enforces durable anti-spam config:
  - `RATE_LIMIT_BACKEND=upstash`
  - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  - `CAPTCHA_ENABLED=1` + `CAPTCHA_SECRET`

## 6) QR Print Validation
- Generate QR assets from admin memorial editor.
- Print test one small and one large sample.
- Scan on iOS and Android.
- Mark tested short links as `Verified` in Admin Settings.
