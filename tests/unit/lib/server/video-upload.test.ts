import {
  getVideoTranscodeApiBaseOrThrow,
  getVideoTranscodeApiTokenOrThrow,
  getVideoTranscodeCallbackTokenOrThrow,
  isPlaceholderVideoTranscodeApiBase,
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

  it('treats placeholder transcode endpoints as unconfigured', () => {
    process.env.VIDEO_TRANSCODE_API_BASE =
      'https://your-cloud-run-service.run.app'
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'

    expect(
      isPlaceholderVideoTranscodeApiBase(process.env.VIDEO_TRANSCODE_API_BASE)
    ).toBe(true)
    expect(isVideoTranscodeConfigured()).toBe(false)
    expect(() => getVideoTranscodeApiBaseOrThrow()).toThrow(
      'Missing VIDEO_TRANSCODE_API_BASE'
    )
  })

  it('reports whether the video transcode stack is fully configured', () => {
    expect(isVideoTranscodeConfigured()).toBe(false)

    process.env.VIDEO_TRANSCODE_API_BASE = 'https://video.example.com'
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'

    expect(isVideoTranscodeConfigured()).toBe(true)
  })

  it('treats invalid urls as non-placeholder values without throwing', () => {
    expect(isPlaceholderVideoTranscodeApiBase('not a url')).toBe(false)
  })

  it('treats an omitted transcode url as non-placeholder', () => {
    expect(isPlaceholderVideoTranscodeApiBase(undefined)).toBe(false)
  })

  it('treats empty or whitespace-only base urls as missing', () => {
    process.env.VIDEO_TRANSCODE_API_BASE = '   '

    expect(isVideoTranscodeConfigured()).toBe(false)
    expect(() => getVideoTranscodeApiBaseOrThrow()).toThrow(
      'Missing VIDEO_TRANSCODE_API_BASE'
    )
  })

  it('treats example.com placeholders as unconfigured even with a token set', () => {
    process.env.VIDEO_TRANSCODE_API_BASE = 'https://example.com/'
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'

    expect(
      isPlaceholderVideoTranscodeApiBase(process.env.VIDEO_TRANSCODE_API_BASE)
    ).toBe(true)
    expect(isVideoTranscodeConfigured()).toBe(false)
  })

  it('requires both transcode tokens for the stack to count as configured', () => {
    process.env.VIDEO_TRANSCODE_API_BASE = 'https://video.example.com/'
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'

    expect(isVideoTranscodeConfigured()).toBe(false)

    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'
    expect(isVideoTranscodeConfigured()).toBe(true)
  })

  it('returns the configured api and callback tokens when present', () => {
    process.env.VIDEO_TRANSCODE_API_TOKEN = 'api-token'
    process.env.VIDEO_TRANSCODE_CALLBACK_TOKEN = 'callback-token'

    expect(getVideoTranscodeApiTokenOrThrow()).toBe('api-token')
    expect(getVideoTranscodeCallbackTokenOrThrow()).toBe('callback-token')
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
