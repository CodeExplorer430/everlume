# Family Admin Playbook

Audience: family admins operating Everlume without developer support.

## 1) Daily Tasks
- Sign in at `/login`.
- Review Dashboard totals and pending moderation items.
- Approve/unapprove/delete guestbook entries in `Admin -> Guestbook`.
- Confirm short links still resolve (`Admin -> Short Links`).

## 2) Create a Memorial
1. Go to `Admin -> Create Memorial`.
2. Fill title, slug, full name, birth/death dates.
3. Save and open the memorial editor.
4. Set page privacy (`public` for publish, `private` for restricted viewing).

## 3) Upload Media
- Photos:
  - Use Cloudinary uploader from memorial editor.
  - Add captions and set hero image.
- Videos:
  - Upload to YouTube as **Unlisted** first.
  - Paste YouTube URL into Video Links.
  - For files over **100MB**, do not upload directly to app storage.

## 4) Guestbook Moderation
- Open `Admin -> Guestbook`.
- Approve respectful posts.
- Unapprove or delete spam/inappropriate messages.
- If spam spikes, pause approvals and notify project owner.

## 5) Short Links + QR
1. Create shortcode in `Admin -> Short Links` (lowercase letters/numbers/dashes, 3-32 chars).
2. Keep target URL accurate.
3. Generate QR from memorial editor.
4. Download:
   - SVG for engraving,
   - 2048px PNG for print.
5. After physical scan test, mark link as **Verified**.

## 6) Export + Backup
- Use page Export Data section for CSV/ZIP where available.
- Keep original master photos/videos in shared family drive.
- Confirm weekly that automated backups are succeeding (see operations docs).

## 7) Safe Operating Rules
- Do:
  - Use MFA on all platform accounts.
  - Keep at least 2 backup copies of originals.
  - Test printed QR before final engraving.
- Do not:
  - Share root credentials in chat/email.
  - Delete redirect codes used on physical plaques.
  - Disable production links without replacement.
