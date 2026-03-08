# Project Requirements — Everlume Full-Stack App

**Last updated:** 2026-03-04

> Purpose: a full-stack web application allowing family members to create, manage, and share a digital memorial for a loved one. The site must be accessible via a short URL and QR code printed on the memorial tablet. The application must provide an authenticated admin area for media management and guestbook moderation while offering a clean, fast, mobile-first public experience.

---

## Table of contents
1. Overview & Goals
2. Stakeholders
3. Constraints & Assumptions
4. Glossary
5. Scope (In / Out)
6. Functional Requirements
7. Non-Functional Requirements
8. User Roles & Permissions
9. User Stories & Acceptance Criteria
10. Data Model (summary)
11. API Endpoints (summary)
12. UI Structure & Pages
13. Media Upload & Processing Workflows
14. QR / Short URL & Print Specs
15. Security & Privacy Requirements
16. Backup & Recovery
17. Deployment & Hosting (free-first)
18. Testing & QA Plan
19. Development Roadmap & Milestones
20. Risk Register & Mitigations
21. Maintenance & Handover
22. Appendix: SQL table definitions (starter)

---

## 1. Overview & Goals
**Goal:** Build a production-capable full-stack web app that lets family administrators upload and manage photos, videos, timeline entries, and guestbook messages for a memorial. Public visitors access the memorial via an easy-to-scan QR and short URL printed on the memorial tablet.

**Primary success criteria:**
- Admin can sign in with an individual account, upload media, and publish a memorial without requiring technical knowledge.
- Public page loads on mobile within 5 seconds on typical 4G connections.
- A high-resolution, durable QR image can be generated and tested for engraving/printing.
- Family can export/backup all media + guestbook entries.

---

## 2. Stakeholders
- **Primary:** Family (admin: aunt), visitors (public)
- **Secondary:** You (developer/maintainer), cemetery staff / plaque vendor
- **Support:** Hosting / platform providers (Supabase, Vercel, Cloudflare)

---

## 3. Constraints & Assumptions
- Development environment: Ubuntu 24.04 LTS; tools: Next.js, Node.js, Git, VS Code.
- Prefer free or near-free hosted services (Supabase free tier, Vercel free tier, YouTube unlisted for video). Minimal budget for printing/engraving.
- Internet access is expected at the cemetery (mobile data). Short URL printed near code is required as fallback.
- Project will be actively developed during Christmas break and continued part-time afterward.

---

## 4. Glossary
- **Admin:** authenticated user who can manage a memorial.
- **Guestbook:** public message list; entries may be moderated by admin.
- **Short URL / Redirect:** stable URL used on plaque that can be repointed without reprinting.
- **Public memorial:** the publicly visible memorial at `/memorials/:slug`.

---

## 5. Scope (In / Out)
**In (this project):**
- Admin authentication and user management.
- Media upload (images, poster for videos), metadata editing, gallery UI.
- Video embedding (YouTube unlisted by default) + poster thumbnails.
- Public memorial with hero, gallery, timeline, guestbook, share/OG meta.
- Short redirect route + QR generation (SVG/PNG) for printing.
- Export of media metadata and guestbook (ZIP/CSV/JSON).

**Out (not in MVP):**
- Heavy server-side video transcoding (defer to cloud service if needed).
- Paid streaming/CDN beyond free-tier options.
- Advanced privacy workflows (per-user access control at scale) until requested.

---

## 6. Functional Requirements
### 6.1 Admin / Management
- FR-A1: Admin login using secure auth with individual email/password accounts via chosen auth provider.
- FR-A2: Admin can create and edit a memorial (title, full name, DOB, DOD, dedication text, slug).
- FR-A3: Admin can bulk upload images using Cloudinary Upload Widget; app stores Cloudinary IDs/URLs and renders transformed variants.
- FR-A4: Admin can add video links (YouTube unlisted). Videos above 100MB are YouTube-only.
- FR-A5: Admin can edit photo metadata (caption, date, order), set hero image, and remove assets.
- FR-A6: Admin can moderate guestbook entries (approve/delete) and export memorial records through the archive surface (JSON/CSV/ZIP as applicable).
- FR-A7: Admin can generate/download a print-ready QR (SVG + recommended PNG sizes) and manage short redirect codes.

### 6.2 Public
- FR-P1: Public memorial accessible at `/memorials/:slug` and via short redirect `/r/:code`.
- FR-P2: Show hero image, dates, dedication text, gallery with captions, embedded videos, and timeline.
- FR-P3: Guestbook posting endpoint (POST), optionally protected by reCAPTCHA or rate limiting.
- FR-P4: Images are lazy-loaded with responsive `srcset`; clicking opens lightbox/fullscreen.
- FR-P5: OG/Twitter meta tags for social sharing.

### 6.3 Media & Exports
- FR-M1: Images stored in Cloudinary and referenced by `cloudinary_public_id` and URLs in the database.
- FR-M2: Thumbnails and web-optimized images generated with Cloudinary URL transformations (`w_400,f_auto,q_auto` etc.).
- FR-M3: Exportable memorial archive with memorial JSON, guestbook CSV, photo metadata CSV, and photo ZIP.

---

## 7. Non-Functional Requirements
- NFR-Perf: Time-to-interactive on mobile 4G <= 5s for the main public memorial.
- NFR-Sec: HTTPS enforced; admin endpoints require authentication; inputs validated and sanitized.
- NFR-Resilience: Backups of DB and original media kept offsite; app should recover from single-node failure.
- NFR-Maint: Codebase documented, minimal dependencies, dev README + deployment docs.
- NFR-Privacy: Unlisted videos by default; private-mode documented (signed URLs) for stricter privacy.
- NFR-Accessibility: Images have alt text; components keyboard accessible; color contrast WCAG AA.

---

## 8. User Roles & Permissions
- **Super Admin** (developer / initial owner): full access to everything, perform DB exports.
- **Admin** (family): create/edit memorials, upload media, moderate guestbook, generate QR/shortcode.
- **Public**: view memorials, post guestbook entries (subject to moderation).

---

## 9. User Stories & Acceptance Criteria (selected)
**US-01 (Admin login)**
- *Story:* As an admin I want to sign in so I can manage the memorial.
- *Acceptance:* Admin can log in via email and see admin dashboard within 5s.

**US-02 (Upload images)**
- *Story:* As an admin I want to upload photos so I can populate the gallery.
- *Acceptance:* Admin can select multiple images in Cloudinary widget, image metadata is saved in DB, and transformed thumbnails appear in gallery within 10s for small batches.

**US-03 (Generate QR)**
- *Story:* As an admin I want an SVG QR for the short URL so I can send to the engraver.
- *Acceptance:* Admin can download an SVG and PNG (300 DPI) generated from the short redirect URL.

**US-04 (Guestbook)**
- *Story:* As a visitor I want to leave a message.
- *Acceptance:* Visitor posts message; admin receives unapproved entry and can approve/delete it.

---

## 10. Data Model (summary)
High-level entities: `users`, `pages`, `photos`, `videos`, `timeline_events`, `guestbook`, `redirects`, `audit_logs`.

(See Appendix for starter SQL definitions.)

---

## 11. API Endpoints (summary)
**Public**
- `GET /memorials/:slug` — render public memorial
- `GET /api/public/pages/:slug/media` — return memorial media list with access enforcement
- `POST /api/public/pages/:slug/unlock` — unlock password-protected memorial
- `POST /api/guestbook` — add guestbook entry (rate-limited)

**Admin (auth required)**
- `POST /api/admin/memorials` — create memorial
- `PATCH /api/admin/memorials/:id` — update memorial
- `POST /api/admin/photos` — register uploaded photo metadata from Cloudinary uploads
- `POST /api/admin/videos` — register video link
- `GET /api/admin/guestbook` — list
- `POST /api/admin/guestbook/:id/approve` — approve
- `POST /api/admin/redirects` — create short redirect

---

## 12. UI Structure & Pages
**Public pages**
- Homepage (optional family listing)
- Memorial (`/memorials/:slug`): hero, gallery, videos, timeline, guestbook, share/print info

**Admin pages**
- Login / Profile
- Dashboard: list of memorials and quick actions
- Memorial editor: meta, hero, timeline editor
- Media manager: upload, bulk edit, reorder, delete
- Guestbook moderation
- Settings: shortcodes & QR export, access mode defaults, export/archive guidance

Design notes: mobile-first, progressive enhancement, keep keyboard navigation in mind.

---

## 13. Media Upload & Processing Workflows
### Cloudinary flow (preferred)
1. Admin opens Cloudinary Upload Widget and selects images.
2. Cloudinary stores original images and returns upload metadata (`public_id`, `secure_url`, dimensions, bytes).
3. App writes image metadata to Supabase `photos` table.
4. Public/admin galleries use Cloudinary URL transformations for responsive variants.

### Video handling
- Preferred: admin uploads to YouTube (unlisted) and pastes video ID.
- Policy: videos above 100MB must be uploaded to YouTube; no direct in-app upload for large files.

### Background processing (optional)
- Optional scheduled jobs can precompute or warm image variants if needed.

---

## 14. QR / Short URL & Print Specs
- **Short redirect path:** `/r/:code` or Cloudflare Worker route
- **QR generation:** error level: `H`; output: `SVG` (preferred), and `PNG` at 300 DPI for printing.
- **Minimum physical size:** 40×40 mm recommended (test at cemetery distance). Include fallback short URL text next to QR.
- **Validation:** test with iOS & Android camera apps and third-party scanners in the actual lighting/angle conditions.

---

## 15. Security & Privacy Requirements
- Enforce HTTPS; HSTS recommended.
- Use prepared statements / ORM to prevent SQL injection.
- Validate & sanitize all uploaded filenames and metadata.
- Limit upload types & sizes; whitelist MIME types.
- Use Supabase Row Level Security (RLS) or signed URLs for private mode.
- Implement rate-limiting and optionally reCAPTCHA for guestbook.
- Store secrets in environment variables; do not commit credentials.
- Maintain an access consent log for published media.

---

## 16. Backup & Recovery
- DB: automated daily backups (Supabase snapshot or automated pg_dump); weekly offsite backup.
- Media originals: keep on external HDD and optionally Google Drive/Dropbox; store at least two copies.
- Recovery plan: documented restore steps; test restore quarterly.

---

## 17. Deployment & Hosting (free-first)
- **Frontend:** Vercel (Next.js integration) — free tier sufficient for initial usage.
- **DB/Auth:** Supabase free tier.
- **Images/CDN:** Cloudinary.
- **Short redirect / DNS:** Cloudflare (free) + Workers (free tier) with short domain routing.
- **CI:** GitHub Actions for lint/typecheck/build.
- **CD:** Vercel Git integration for Next.js; GitHub Actions worker deploy for Cloudflare Worker.

---

## 18. Testing & QA Plan
- Unit tests (backend logic): Jest / Playwright for E2E.
- Integration tests for media flow (mock Cloudinary responses in dev when needed).
- E2E: login, upload images, register photo, view public memorial, post guestbook, approve entry.
- Manual QA: multiple phone models for scanning QR and loading pages in expected network conditions.
- Accessibility audit: axe / Lighthouse.

---

## 19. Development Roadmap & Milestones (suggested order)
1. Project setup: repo, supabase project, Vercel link, env config.
2. Auth & basic admin flow (login + create memorial).
3. Cloudinary upload widget + transformed image rendering + metadata persistence.
4. Public memorial rendering (SSR) + gallery and lightbox.
5. Guestbook + moderation.
6. Short redirect + QR generation; print test.
7. Export & backup features; documentation & handover.
8. Optional: server-side thumbnails, PWA offline cache, password-protected pages.

---

## 20. Risk Register & Mitigations (top items)
- **Printed QR becomes unreachable (hosting change):** use short redirect so target can be changed. Test redirect frequently.
- **Cloud storage costs rise:** keep only delivery variants online, apply transformation limits, and back up originals offline.
- **Guestbook spam:** moderate, use reCAPTCHA, and rate-limiting.
- **Unauthorized access:** use strong auth, RLS for private content, and enforce secure cookies.

---

## 21. Maintenance & Handover
Deliverables to hand over to family:
- Credentials (store in password manager)
- Short README that explains: how to log in, how to upload media, how to export and back up, how to create a short code and generate QR, and how to remove content.
- Folder with exported originals and final engraving-ready QR files (SVG + PNG).

Operational cadence:
- Quarterly check: test QR & page loads, verify backups.
- Annual: refresh SSL certs / rotate keys if not managed.

---

## 22. Appendix: SQL table definitions (starter)
> These are starter SQL snippets intended for Postgres (Supabase). Use with migration tooling or directly in SQL editor.

```sql
-- users table (if not using Supabase managed auth for profiles)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  full_name text,
  dob date,
  dod date,
  hero_image_url text,
  privacy text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  cloudinary_public_id text,
  image_url text,
  thumb_url text,
  caption text,
  taken_at date,
  sort_index int DEFAULT 0,
  metadata jsonb, -- optional additional Cloudinary payload
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  provider text,
  provider_id text,
  poster_path text,
  title text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  year int,
  text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guestbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  name text,
  email text,
  message text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode text UNIQUE,
  target_url text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
```

---

### Notes & next steps
- This document is intended as the single source of truth for feature and technical requirements. Use it to guide scoping, sprint planning, and acceptance testing.
- If you’d like, I can now generate one or more of the following artifacts from this doc: a starter Next.js repo scaffold, Supabase migration SQL file, Prisma schema, backend API OpenAPI spec, or admin UI wireframes.

## Implementation Status (2026-03-06)
- Role-based admin API authorization implemented (`viewer`/`editor`/`admin`) via shared guard in `src/lib/server/admin-auth.ts`.
- Private and password-protected memorial media flow implemented using short-lived signed proxy URLs.
- Guestbook anti-abuse upgraded with durable rate-limit adapter support (Upstash) plus optional CAPTCHA verification.
- Admin mutation audit logging implemented with `admin_audit_logs` migration and `/api/admin/audit-logs` endpoint.
- RLS hardening migration added for `admin_audit_logs` and stricter `profiles` read/update policies.

---

*End of requirements document.*
