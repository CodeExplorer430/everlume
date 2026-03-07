# Video Transcode Service (Cloud Run)

This service implements the app contract expected by:
- `POST /jobs/init`
- `POST /jobs/:id/start`

It accepts upload bytes via a signed upload URL (`PUT /uploads/:jobId`), runs ffmpeg compression, uploads the output to Cloudinary as a `video` resource, then calls back:
- `POST <app>/api/internal/video-transcode/callback`

## Required environment variables

- `VIDEO_TRANSCODE_API_TOKEN`
- `VIDEO_TRANSCODE_CALLBACK_TOKEN`
- `CLOUDINARY_CLOUD_NAME` (or `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional:
- `VIDEO_TRANSCODE_MAX_BYTES` (default `104857600`)
- `VIDEO_TRANSCODE_TARGET_BYTES` (default `99614720`)
- `CLOUDINARY_VIDEO_FOLDER` (default `everlume/videos`)
- `VIDEO_TRANSCODE_TMP_DIR`

## Local run

```bash
VIDEO_TRANSCODE_API_TOKEN=token \
VIDEO_TRANSCODE_CALLBACK_TOKEN=callback_token \
CLOUDINARY_CLOUD_NAME=your_cloud_name \
CLOUDINARY_API_KEY=your_key \
CLOUDINARY_API_SECRET=your_secret \
node services/video-transcode/server.mjs
```

Health endpoint:

```bash
curl http://localhost:8080/healthz
```
