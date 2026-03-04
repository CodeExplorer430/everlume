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
- `SUPABASE_SERVICE_ROLE_KEY`
- `FALLBACK_URL`

## Redirect Rules
- Valid code -> HTTP 302 redirect to `target_url`
- Missing/invalid code -> HTTP 404
- Root path -> redirect to `FALLBACK_URL` when provided

## DNS
- Keep DNS managed in Cloudflare.
- Route short-domain traffic to Worker route.
- Keep Next.js frontend deployed in Vercel.

## Recommended Initial Setup (Before Vercel)
- Use a real Cloudflare subdomain (example: `go.yourdomain.com`).
- Route: `go.yourdomain.com/*` -> `everlume-redirector`.
- Set `FALLBACK_URL` to a temporary public page so root `/` is not dead while frontend is still pending.
- Set `NEXT_PUBLIC_SHORT_DOMAIN` in app env to the same short domain.

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
