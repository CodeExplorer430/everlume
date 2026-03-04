# Media Policy

## Image Storage and Delivery
- Images are uploaded with Cloudinary Upload Widget from the admin panel.
- DB records store Cloudinary metadata in `photos`:
  - `cloudinary_public_id`
  - `image_url`
  - `thumb_url`
- Rendered media should use Cloudinary transformed URLs (`f_auto`, `q_auto`, width-specific variants).

## Video Policy
- Admin flow is YouTube-first.
- UI must show: "Upload videos to YouTube first, then paste the link here."
- Large raw video uploads are not supported in-app.
- Policy threshold in this project: files above 100MB must be uploaded to YouTube Unlisted.

## Backup Policy
- Keep original masters in shared Google Drive for family handover and disaster recovery.
