#!/usr/bin/env node

import { loadLocalEnv } from './load-env.mjs'

loadLocalEnv()

const base = process.env.VIDEO_TRANSCODE_API_BASE
const apiToken = process.env.VIDEO_TRANSCODE_API_TOKEN
const callbackToken = process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN

if (!base || !apiToken || !callbackToken) {
  console.error('Missing required env vars: VIDEO_TRANSCODE_API_BASE, VIDEO_TRANSCODE_API_TOKEN, VIDEO_TRANSCODE_CALLBACK_TOKEN')
  process.exit(1)
}

const health = await fetch(`${base.replace(/\/+$/, '')}/healthz`).catch(() => null)
if (!health || !health.ok) {
  console.error('Transcode health check failed.')
  process.exit(1)
}

const init = await fetch(`${base.replace(/\/+$/, '')}/jobs/init`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${apiToken}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    jobId: '550e8400-e29b-41d4-a716-446655440000',
    pageId: '550e8400-e29b-41d4-a716-446655440001',
    fileName: 'contract-check.mp4',
    fileSize: 1024,
    mimeType: 'video/mp4',
    callbackUrl: 'https://example.com/api/internal/video-transcode/callback',
  }),
}).catch(() => null)

if (!init || !init.ok) {
  const text = init ? await init.text() : 'No response'
  console.error(`Transcode init failed: ${text}`)
  process.exit(1)
}

const payload = await init.json().catch(() => null)
if (!payload?.uploadUrl || !payload?.uploadMethod) {
  console.error('Transcode init response is missing uploadUrl/uploadMethod.')
  process.exit(1)
}

console.log('Transcode contract check passed: health + init endpoint are reachable and shaped correctly.')
