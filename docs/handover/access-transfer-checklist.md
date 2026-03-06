# Access Transfer Checklist

Use this when moving ownership from developer to family operators.

## 1) Accounts to Transfer
- GitHub repository admin
- Vercel project admin
- Supabase project owner/admin
- Cloudinary product environment admin
- Cloudflare account (DNS + Workers)

## 2) Required Security Baseline
- Enable MFA for every owner account.
- Add at least 2 owners for continuity.
- Store recovery codes in family password manager.
- Remove inactive users immediately.

## 3) Secret Rotation Checklist
Rotate after transfer and after any suspected leak:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRIVATE_MEDIA_TOKEN_SECRET`
- `UPSTASH_REDIS_REST_TOKEN` (if used)
- Cloudflare API tokens
- Cloudinary API credentials (if server-side usage added)

## 4) Transfer Procedure
1. Add family owner account with full rights.
2. Confirm family owner can:
   - deploy frontend,
   - deploy worker,
   - view backups,
   - manage env vars/secrets.
3. Rotate secrets.
4. Update `.env.local.example` / runbooks with new key names only (never values).
5. Remove old owner access if no longer needed.

## 5) Verification
- Family owner signs in and edits a memorial page.
- Family owner creates and verifies one short link.
- Family owner runs required checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage`
  - `npm run test:e2e:webpack`
  - `npm run test:perf`

## 6) Completion Record
- Date completed:
- Old owners removed:
- Secrets rotated:
- Verified by:
