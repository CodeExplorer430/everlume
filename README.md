# Digital Tribute Web App

A full-stack web app for creating, managing, and sharing memorial tribute pages with QR-friendly short links.

## Core Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Hosting:** Vercel (Git integration)
- **Database/Auth:** Supabase (Postgres + Auth)
- **Image Storage/CDN:** Cloudinary (Upload Widget + URL transformations)
- **Video:** YouTube Unlisted (required for large files)
- **Short Links/DNS:** Cloudflare Workers + Cloudflare DNS

## Features
- Authenticated admin dashboard for managing tribute pages
- Cloudinary bulk photo upload and optimized gallery rendering
- YouTube video embedding workflow in admin/public pages
- Timeline editor and moderated guestbook
- QR code generation with short-link support
- CSV/ZIP export tools for guestbook and media metadata

## Local Setup

### 1) Install
```bash
npm install
```

### 2) Environment variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

### 3) Database migrations
Run SQL migrations in order from `supabase/migrations/`:
- `20251227000000_initial_schema.sql`
- `20251227000001_storage_setup.sql` (legacy)
- `20260304000000_cloudinary_photo_fields.sql`

## Run and Validate
```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## CI/CD
- **GitHub Actions CI:** lint + typecheck + build on PRs/pushes (`.github/workflows/ci.yml`)
- **Vercel deploys:** previews on PRs and production on merge to main branch
- **Cloudflare Worker deploy:** `.github/workflows/deploy-worker.yml`

Operational docs:
- `docs/operations/ci-cd.md`
- `docs/operations/media-policy.md`
- `docs/operations/short-links.md`

## Video Upload Policy
For large files, admins must use YouTube Unlisted:
- Upload to YouTube first
- Paste the YouTube URL in admin video manager

Project threshold: files above **100MB** should be treated as YouTube-only.
