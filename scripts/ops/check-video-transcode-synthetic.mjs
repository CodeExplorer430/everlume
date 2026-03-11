#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { loadLocalEnv } from './load-env.mjs'

loadLocalEnv()

const apiBaseRaw = process.env.VIDEO_TRANSCODE_API_BASE
const apiToken = process.env.VIDEO_TRANSCODE_API_TOKEN
const callbackToken = process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN
const appBaseRaw = process.env.VIDEO_TRANSCODE_APP_BASE

if (!apiBaseRaw || !apiToken || !callbackToken || !appBaseRaw) {
  console.error(
    'Missing required env vars: VIDEO_TRANSCODE_API_BASE, VIDEO_TRANSCODE_API_TOKEN, VIDEO_TRANSCODE_CALLBACK_TOKEN, VIDEO_TRANSCODE_APP_BASE'
  )
  process.exit(1)
}

const apiBase = apiBaseRaw.replace(/\/+$/, '')
const appBase = appBaseRaw.replace(/\/+$/, '')
const callbackUrl = `${appBase}/api/internal/video-transcode/callback`

function assertStatus(label, actual, expected) {
  const accepted = Array.isArray(expected) ? expected : [expected]
  if (!accepted.includes(actual)) {
    throw new Error(
      `${label} expected status ${accepted.join(' or ')}, received ${actual}.`
    )
  }
}

async function request(url, options) {
  const response = await fetch(url, options).catch((error) => {
    throw new Error(
      `Request failed: ${url} (${error instanceof Error ? error.message : 'unknown error'})`
    )
  })
  return response
}

async function main() {
  const jobId = randomUUID()
  const pageId = randomUUID()

  const health = await request(`${apiBase}/healthz`)
  assertStatus('Health check', health.status, 200)

  const initUnauthorized = await request(`${apiBase}/jobs/init`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jobId,
      pageId,
      fileName: 'synthetic-check.mp4',
      fileSize: 1024,
      mimeType: 'video/mp4',
      callbackUrl,
    }),
  })
  assertStatus('Init unauthorized check', initUnauthorized.status, 401)

  const initAuthorized = await request(`${apiBase}/jobs/init`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jobId,
      pageId,
      fileName: 'synthetic-check.mp4',
      fileSize: 1024,
      mimeType: 'video/mp4',
      callbackUrl,
    }),
  })
  assertStatus('Init authorized check', initAuthorized.status, 200)
  const initPayload = await initAuthorized.json().catch(() => null)
  if (!initPayload?.uploadUrl || !initPayload?.uploadMethod) {
    throw new Error('Init payload is missing uploadUrl/uploadMethod.')
  }

  const startUnauthorized = await request(`${apiBase}/jobs/${jobId}/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jobId }),
  })
  assertStatus('Start unauthorized check', startUnauthorized.status, 401)

  const startAuthorized = await request(`${apiBase}/jobs/${jobId}/start`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ jobId }),
  })
  assertStatus('Start authorized check', startAuthorized.status, [200, 202])

  const callbackUnauthorized = await request(callbackUrl, {
    method: 'POST',
    headers: {
      authorization: 'Bearer invalid-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jobId,
      status: 'processing',
    }),
  })
  assertStatus('Callback unauthorized check', callbackUnauthorized.status, 403)

  const callbackAuthorized = await request(callbackUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${callbackToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jobId,
      status: 'processing',
    }),
  })
  assertStatus('Callback authorized check', callbackAuthorized.status, 200)

  console.log(
    'Synthetic transcode check passed: health, auth guards, init/start, and callback token validation are working.'
  )
}

await main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Synthetic transcode check failed.'
  )
  process.exit(1)
})
