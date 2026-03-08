import { POST } from '@/app/api/admin/videos/uploads/[jobId]/start/route'

const mockRequireAdminUser = vi.fn()
const mockAssertMemorialOwnership = vi.fn()
const mockLogAdminAudit = vi.fn()
const mockIsVideoTranscodeConfigured = vi.fn()
const mockGetVideoTranscodeApiBaseOrThrow = vi.fn()
const mockGetVideoTranscodeApiTokenOrThrow = vi.fn()

const mockJobSingle = vi.fn()
const mockJobEq = vi.fn(() => ({ single: mockJobSingle }))
const mockJobSelect = vi.fn(() => ({ eq: mockJobEq }))
const mockJobUpdateEq = vi.fn()
const mockJobUpdate = vi.fn(() => ({ eq: mockJobUpdateEq }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  assertMemorialOwnership: (...args: unknown[]) => mockAssertMemorialOwnership(...args),
  forbidden: (message: string) => new Response(JSON.stringify({ code: 'FORBIDDEN', message }), { status: 403 }),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

vi.mock('@/lib/server/video-upload', () => ({
  isVideoTranscodeConfigured: () => mockIsVideoTranscodeConfigured(),
  getVideoTranscodeApiBaseOrThrow: () => mockGetVideoTranscodeApiBaseOrThrow(),
  getVideoTranscodeApiTokenOrThrow: () => mockGetVideoTranscodeApiTokenOrThrow(),
}))

describe('POST /api/admin/videos/uploads/[jobId]/start', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockRequireAdminUser.mockReset()
    mockAssertMemorialOwnership.mockReset()
    mockLogAdminAudit.mockReset()
    mockIsVideoTranscodeConfigured.mockReset()
    mockGetVideoTranscodeApiBaseOrThrow.mockReset()
    mockGetVideoTranscodeApiTokenOrThrow.mockReset()
    mockJobSingle.mockReset()
    mockJobUpdateEq.mockReset()
    mockJobEq.mockClear()
    mockJobSelect.mockClear()
    mockJobUpdate.mockClear()

    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: () => ({
          select: mockJobSelect,
          update: mockJobUpdate,
        }),
      },
    })
    mockAssertMemorialOwnership.mockResolvedValue(true)
    mockIsVideoTranscodeConfigured.mockReturnValue(true)
    mockGetVideoTranscodeApiBaseOrThrow.mockReturnValue('https://transcode.example.com')
    mockGetVideoTranscodeApiTokenOrThrow.mockReturnValue('token-1')
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'queued',
        cloud_job_id: 'cloud-job-1',
      },
      error: null,
    })
    mockJobUpdateEq.mockResolvedValue({ error: null })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  })

  it('returns 400 for invalid job id param', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/not-a-uuid/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: 'not-a-uuid' }) })

    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('returns auth response when user is not authorized', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(403)
  })

  it('returns 500 when upload job lookup fails', async () => {
    mockJobSingle.mockResolvedValue({ data: null, error: { message: 'read failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
  })

  it('returns 403 when user does not own memorial', async () => {
    mockAssertMemorialOwnership.mockResolvedValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(403)
  })

  it('returns 409 for invalid job status', async () => {
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'completed',
        cloud_job_id: 'cloud-job-1',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(409)
  })

  it('returns 503 when transcode service is not configured', async () => {
    mockIsVideoTranscodeConfigured.mockReturnValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(503)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns 503 when transcode upstream is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(503)
  })

  it('returns 502 with upstream message when start call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'upstream denied job start' }), { status: 500 })
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(502)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('upstream denied job start')
  })

  it('returns 502 with fallback message when upstream error body is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('oops', { status: 500 }))

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(502)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('Unable to start transcode job.')
  })

  it('returns 500 when status update fails after upstream success', async () => {
    mockJobUpdateEq.mockResolvedValue({ error: { message: 'write failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 202, updates job, and audits on success', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/start', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(202)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://transcode.example.com/jobs/cloud-job-1/start',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(mockJobUpdate).toHaveBeenCalledWith({ status: 'processing' })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'video.upload_start',
        entity: 'video_upload',
        metadata: { memorialId: 'page-1' },
      })
    )
  })
})
