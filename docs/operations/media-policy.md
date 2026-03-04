# Media Policy

## Image Storage and Delivery
- Images are uploaded with Cloudinary Upload Widget from the admin panel.
- DB records store Cloudinary metadata in `photos`:
  - `cloudinary_public_id`
  - `image_url`
  - `thumb_url`
- Rendered media should use Cloudinary transformed URLs (`f_auto`, `q_auto`, width-specific variants).
- Required upload preset baseline:
  - Unsigned preset enabled for widget upload.
  - Preset name should be stable (recommended: `everlume_unsigned_upload`).
  - Asset folder should be `everlume`.
  - Public ID should be auto-generated and unguessable.

## Video Policy
- Admin flow is YouTube-first.
- UI must show: "Upload videos to YouTube first, then paste the link here."
- Large raw video uploads are not supported in-app.
- Policy threshold in this project: files above 100MB must be uploaded to YouTube Unlisted.

## Backup Policy
- Keep original masters in shared Google Drive for family handover and disaster recovery.
