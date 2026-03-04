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
   - `SUPABASE_SERVICE_ROLE_KEY`
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

## 4) Local Validation
Run before deploy:
```bash
npm run ops:check-prereqs
npm run lint
npm run typecheck
npm run test:coverage
```
