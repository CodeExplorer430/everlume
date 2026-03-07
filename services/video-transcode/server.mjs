#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PORT || 8080)
const API_TOKEN = process.env.VIDEO_TRANSCODE_API_TOKEN || ''
const CALLBACK_TOKEN = process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN || ''
const MAX_OUTPUT_BYTES = Number(process.env.VIDEO_TRANSCODE_MAX_BYTES || 100 * 1024 * 1024)
const TARGET_OUTPUT_BYTES = Number(process.env.VIDEO_TRANSCODE_TARGET_BYTES || 95 * 1024 * 1024)
const TMP_ROOT = process.env.VIDEO_TRANSCODE_TMP_DIR || path.join(os.tmpdir(), 'everlume-transcode')

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ''
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ''
const CLOUDINARY_VIDEO_FOLDER = process.env.CLOUDINARY_VIDEO_FOLDER || 'everlume/videos'

const jobs = new Map()

await mkdir(TMP_ROOT, { recursive: true })

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function unauthorized(res) {
  json(res, 401, { code: 'UNAUTHORIZED', message: 'Missing or invalid API token.' })
}

function parseAuthToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length)
}

function ensureApiAuth(req, res) {
  if (!API_TOKEN || parseAuthToken(req) !== API_TOKEN) {
    unauthorized(res)
    return false
  }
  return true
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

async function sendCallback(callbackUrl, payload) {
  if (!callbackUrl || !CALLBACK_TOKEN) return
  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${CALLBACK_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `ffmpeg failed with exit code ${code}`))
    })
  })
}

async function transcodeWithProfile(inputPath, outputPath, profile) {
  const args = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    profile.preset,
    '-crf',
    String(profile.crf),
    '-c:a',
    'aac',
    '-b:a',
    profile.audioBitrate,
    '-movflags',
    '+faststart',
    outputPath,
  ]
  await runFfmpeg(args)
}

function cloudinarySignature(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex')
}

async function uploadVideoToCloudinary(outputPath, jobId) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary server credentials are not configured.')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `${CLOUDINARY_VIDEO_FOLDER}/${jobId}`
  const signParams = {
    folder: CLOUDINARY_VIDEO_FOLDER,
    public_id: publicId,
    resource_type: 'video',
    timestamp,
  }
  const signature = cloudinarySignature(signParams, CLOUDINARY_API_SECRET)

  const form = new FormData()
  form.set('file', new Blob([await readFile(outputPath)]), path.basename(outputPath))
  form.set('api_key', CLOUDINARY_API_KEY)
  form.set('timestamp', String(timestamp))
  form.set('signature', signature)
  form.set('resource_type', 'video')
  form.set('folder', CLOUDINARY_VIDEO_FOLDER)
  form.set('public_id', publicId)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: form,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.public_id) {
    throw new Error(payload?.error?.message || 'Cloudinary upload failed.')
  }

  return {
    publicId: payload.public_id,
    secureUrl: payload.secure_url,
    bytes: Number(payload.bytes || 0),
  }
}

async function processJob(jobId) {
  const job = jobs.get(jobId)
  if (!job) return

  const inputPath = path.join(TMP_ROOT, `${job.id}-input`)
  const outputPath = path.join(TMP_ROOT, `${job.id}-output.mp4`)

  try {
    if (!job.uploaded) {
      throw new Error('Upload payload is missing.')
    }

    await sendCallback(job.callbackUrl, {
      jobId: job.id,
      status: 'processing',
    })

    const profiles = [
      { preset: 'medium', crf: 28, audioBitrate: '96k' },
      { preset: 'medium', crf: 32, audioBitrate: '64k' },
    ]

    let outputBytes = 0
    for (const profile of profiles) {
      await transcodeWithProfile(inputPath, outputPath, profile)
      outputBytes = (await stat(outputPath)).size
      if (outputBytes <= TARGET_OUTPUT_BYTES) break
    }

    if (outputBytes > MAX_OUTPUT_BYTES) {
      await sendCallback(job.callbackUrl, {
        jobId: job.id,
        status: 'fallback_required',
        errorMessage: `Compressed output remained above ${Math.round(MAX_OUTPUT_BYTES / (1024 * 1024))}MB.`,
      })
      return
    }

    const uploaded = await uploadVideoToCloudinary(outputPath, job.id)
    await sendCallback(job.callbackUrl, {
      jobId: job.id,
      status: 'completed',
      outputPublicId: uploaded.publicId,
      outputUrl: uploaded.secureUrl,
      outputBytes: uploaded.bytes || outputBytes,
    })
  } catch (error) {
    await sendCallback(job.callbackUrl, {
      jobId: job.id,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown transcode error.',
    })
  } finally {
    await rm(inputPath, { force: true }).catch(() => null)
    await rm(outputPath, { force: true }).catch(() => null)
  }
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
      return json(res, 200, { ok: true })
    }

    if (req.method === 'POST' && requestUrl.pathname === '/jobs/init') {
      if (!ensureApiAuth(req, res)) return
      const payload = await readJsonBody(req)
      const { jobId, callbackUrl, fileName } = payload
      if (!jobId || !callbackUrl || !fileName) {
        return json(res, 400, { code: 'VALIDATION_ERROR', message: 'jobId, callbackUrl, and fileName are required.' })
      }

      const cloudJobId = randomUUID()
      jobs.set(jobId, {
        id: jobId,
        cloudJobId,
        callbackUrl,
        fileName,
        uploaded: false,
      })

      return json(res, 200, {
        cloudJobId,
        uploadUrl: `${requestUrl.origin}/uploads/${jobId}`,
        uploadMethod: 'PUT',
      })
    }

    if (req.method === 'PUT' && requestUrl.pathname.startsWith('/uploads/')) {
      const jobId = requestUrl.pathname.split('/').pop()
      const job = jobs.get(jobId)
      if (!job) return json(res, 404, { code: 'NOT_FOUND', message: 'Unknown upload job.' })

      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const inputPath = path.join(TMP_ROOT, `${job.id}-input`)
      await writeFile(inputPath, Buffer.concat(chunks))
      job.uploaded = true
      jobs.set(jobId, job)
      return json(res, 200, { ok: true })
    }

    if (req.method === 'POST' && requestUrl.pathname.startsWith('/jobs/') && requestUrl.pathname.endsWith('/start')) {
      if (!ensureApiAuth(req, res)) return
      const parts = requestUrl.pathname.split('/')
      const jobId = parts[2]
      const job = jobs.get(jobId)
      if (!job) return json(res, 404, { code: 'NOT_FOUND', message: 'Unknown job.' })

      void processJob(jobId)
      return json(res, 202, { ok: true })
    }

    return json(res, 404, { code: 'NOT_FOUND', message: 'Route not found.' })
  } catch (error) {
    return json(res, 500, {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown server error.',
    })
  }
})

server.listen(PORT, () => {
  console.log(`video-transcode service listening on :${PORT}`)
})
