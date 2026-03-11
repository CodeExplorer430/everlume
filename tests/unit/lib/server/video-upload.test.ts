import {
  getVideoTranscodeApiBaseOrThrow,
  getVideoTranscodeApiTokenOrThrow,
  getVideoTranscodeCallbackTokenOrThrow,
  isVideoTranscodeConfigured,
  videoUploadStatusSchema,
} from '@/lib/server/video-upload'

describe('video-upload helpers', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.VIDEO_TRANSCODE_API_BASE
    delete process.env.VIDEO_TRANSCODE_API_TOKEN
    delete process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('normalizes the transcode api base url', () => {
    process.env.VIDEO_TRANSCODE_API_BASE = 'https://video.example.com///'

    expect(getVideoTranscodeApiBaseOrThrow()).toBe('https://video.example.com')
  })

  it('throws when required env vars are missing', () => {
    expect(() => getVideoTranscodeApiBaseOrThrow()).toThrow(
      'Missing VIDEO_TRANSCODE_API_BASE'
    )
    expect(() => getVideoTranscodeApiTokenOrThrow()).toThrow(
      'Missing VIDEO_TRANSCODE_API_TOKEN'
    )
    expect(() => getVideoTranscodeCallbackTokenOrThrow()).toThrow(
      'Missing VIDEO_TRANSCODE_CALLBACK_TOKEN'
    )
  })

  it('reports whether the video transcode stack is fully configured', () => {
    expect(isVideoTranscodeConfigured()).toBe(false)

    process.env.VIDEO_TRANSCODE_API_BASE = 'https://video.example.com'
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'

    expect(isVideoTranscodeConfigured()).toBe(true)
  })

  it('accepts the expected upload job states', () => {
    expect(videoUploadStatusSchema.safeParse('completed').success).toBe(true)
    expect(videoUploadStatusSchema.safeParse('fallback_required').success).toBe(
      true
    )
    expect(videoUploadStatusSchema.safeParse('not-a-status').success).toBe(
      false
    )
  })
})
