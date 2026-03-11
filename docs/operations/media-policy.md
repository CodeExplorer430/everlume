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

- Admin supports two paths:
  - Direct upload with server-side compression (Cloud Run + ffmpeg).
  - YouTube Unlisted link entry.
- Compression target for Cloudinary free-tier is <=100MB.
- If a video still exceeds 100MB after compression retries, UI must guide fallback to YouTube Unlisted.
- Required env for direct-upload pipeline:
  - `VIDEO_TRANSCODE_API_BASE`
  - `VIDEO_TRANSCODE_API_TOKEN`
  - `VIDEO_TRANSCODE_CALLBACK_TOKEN`
  - `VIDEO_TRANSCODE_APP_BASE`
- Service implementation lives in `services/video-transcode` (Cloud Run container).
- Contract validation commands:
  - `npm run ops:check-video-transcode`
  - `npm run ops:check-video-transcode:synthetic`

## Backup Policy

- Keep original masters in shared Google Drive for family handover and disaster recovery.

## Optional Optimization Prewarm

- Use `npm run ops:media:prewarm` (or the scheduled workflow) to warm common Cloudinary transforms.
- Enable this only when needed with `MEDIA_PREWARM_ENABLED=1`.
- Review `media_optimization_runs` status entries after each run.
