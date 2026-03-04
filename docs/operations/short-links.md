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
