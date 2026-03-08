# Short Links and Redirects

## Architecture
- Public QR code should point to a stable short domain path.
- Cloudflare Worker resolves shortcode to destination URL from Supabase `redirects` table.
- This prevents reprinting plaques when hosting/domain targets change.

## Worker App
- Source: `workers/redirector/src/index.ts`
- Config: `workers/redirector/wrangler.toml`

## Runtime Secrets
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `FALLBACK_URL`

## Redirect Rules
- Active code (`is_active=true`) -> HTTP 302 redirect to `target_url`
- Inactive code (`is_active=false`) -> HTTP 404
- Missing/invalid code -> HTTP 404
- Root path -> redirect to `FALLBACK_URL` when provided
- Worker accepts both `GET` and `HEAD` for monitoring/curl checks.

## App Redirect Route Rules (`/r/[code]`)
- Active code -> HTTP 302 to `target_url` (short cache).
- Missing/invalid/disabled code -> redirect to `/r/not-found` with reason query.
- Redirect records carry:
  - `is_active` (boolean),
  - `print_status` (`unverified` | `verified`),
  - `last_verified_at` (timestamp).

## DNS
- Keep DNS managed in Cloudflare.
- Route short-domain traffic to Worker route.
- Keep Next.js frontend deployed in Vercel.

## Recommended Initial Setup (Before Vercel)
- Use a real Cloudflare subdomain (example: `go.yourdomain.com`).
- Route: `go.yourdomain.com/*` -> `everlume-redirector`.
- Set `FALLBACK_URL` to a temporary public page so root `/` is not dead while frontend is still pending.
- Set `NEXT_PUBLIC_SHORT_DOMAIN` in app env to the same short domain.

## Production Setup Commands
From the repo root:

```bash
npm run test:worker
cd workers/redirector
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put FALLBACK_URL
npx wrangler deploy
```

Then in app environment (Vercel):
- Set `NEXT_PUBLIC_SHORT_DOMAIN=https://go.yourdomain.com`.

Then in Cloudflare DNS/Workers:
- Attach route `go.yourdomain.com/*` to worker `everlume-redirector`.

## Quick Validation
```bash
curl -I https://go.yourdomain.com/test
curl -I https://go.yourdomain.com/unknown
curl -I https://go.yourdomain.com/
```

Expected:
- `/test` -> `302` with `Location` target from Supabase `redirects`.
- `/unknown` -> `404`.
- `/` -> `302` to `FALLBACK_URL` (if configured).

For app route checks:
```bash
curl -I https://app.yourdomain.com/r/test
curl -I https://app.yourdomain.com/r/unknown
```
