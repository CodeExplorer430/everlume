import { z } from 'zod'

export const videoUploadStatusSchema = z.enum([
  'queued',
  'uploading',
  'processing',
  'completed',
  'fallback_required',
  'failed',
  'attached',
])

export type VideoUploadStatus = z.infer<typeof videoUploadStatusSchema>

export function getVideoTranscodeApiBaseOrThrow() {
  const value = process.env.VIDEO_TRANSCODE_API_BASE
  if (value && value.trim() !== '') return value.replace(/\/+$/, '')
  throw new Error('[video:transcode-api] Missing VIDEO_TRANSCODE_API_BASE')
}

export function getVideoTranscodeApiTokenOrThrow() {
  const value = process.env.VIDEO_TRANSCODE_API_TOKEN
  if (value && value.trim() !== '') return value
  throw new Error('[video:transcode-api] Missing VIDEO_TRANSCODE_API_TOKEN')
}

export function getVideoTranscodeCallbackTokenOrThrow() {
  const value = process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN
  if (value && value.trim() !== '') return value
  throw new Error(
    '[video:transcode-callback] Missing VIDEO_TRANSCODE_CALLBACK_TOKEN'
  )
}

export function isVideoTranscodeConfigured() {
  return Boolean(
    process.env.VIDEO_TRANSCODE_API_BASE &&
    process.env.VIDEO_TRANSCODE_API_TOKEN &&
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN
  )
}
