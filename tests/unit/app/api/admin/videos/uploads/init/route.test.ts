import { POST } from '@/app/api/admin/videos/uploads/init/route'

const mockRequireAdminUser = vi.fn()
const mockAssertMemorialOwnership = vi.fn()
const mockLogAdminAudit = vi.fn()

const mockJobInsertSingle = vi.fn()
const mockJobInsertSelect = vi.fn(() => ({ single: mockJobInsertSingle }))
const mockJobInsert = vi.fn(() => ({ select: mockJobInsertSelect }))

const mockJobUpdateSingle = vi.fn()
const mockJobUpdateSelect = vi.fn(() => ({ single: mockJobUpdateSingle }))
const mockJobUpdateEq = vi.fn(() => ({ select: mockJobUpdateSelect }))
const mockJobUpdate = vi.fn(() => ({ eq: mockJobUpdateEq }))

const mockIsVideoTranscodeConfigured = vi.fn()
const mockGetVideoTranscodeApiBaseOrThrow = vi.fn()
const mockGetVideoTranscodeApiTokenOrThrow = vi.fn()

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  assertMemorialOwnership: (...args: unknown[]) =>
    mockAssertMemorialOwnership(...args),
  forbidden: (message: string) =>
    new Response(JSON.stringify({ code: 'FORBIDDEN', message }), {
      status: 403,
    }),
  databaseError: (message: string) =>
    new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), {
      status: 500,
    }),
}))

vi.mock('@/lib/server/video-upload', () => ({
  isVideoTranscodeConfigured: () => mockIsVideoTranscodeConfigured(),
  getVideoTranscodeApiBaseOrThrow: () => mockGetVideoTranscodeApiBaseOrThrow(),
  getVideoTranscodeApiTokenOrThrow: () =>
    mockGetVideoTranscodeApiTokenOrThrow(),
  videoUploadStatusSchema: { _type: 'uploading' },
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/videos/uploads/init', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockRequireAdminUser.mockReset()
    mockAssertMemorialOwnership.mockReset()
    mockLogAdminAudit.mockReset()
    mockIsVideoTranscodeConfigured.mockReset()
    mockGetVideoTranscodeApiBaseOrThrow.mockReset()
    mockGetVideoTranscodeApiTokenOrThrow.mockReset()
    mockJobInsertSingle.mockReset()
    mockJobUpdateSingle.mockReset()
    mockJobInsert.mockClear()
    mockJobUpdate.mockClear()
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'video_upload_jobs')
            return { insert: mockJobInsert, update: mockJobUpdate }
          return {}
        },
      },
    })
    mockAssertMemorialOwnership.mockResolvedValue(true)
    mockIsVideoTranscodeConfigured.mockReturnValue(true)
    mockGetVideoTranscodeApiBaseOrThrow.mockReturnValue(
      'https://transcode.example.com'
    )
    mockGetVideoTranscodeApiTokenOrThrow.mockReturnValue('token')
    mockJobInsertSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        page_id: '550e8400-e29b-41d4-a716-446655440001',
        created_by: 'user-1',
        status: 'queued',
        title: 'Tribute',
        source_filename: 'tribute.mp4',
        source_mime: 'video/mp4',
        source_bytes: 139000000,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })
    mockJobUpdateSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'uploading',
        upload_url: 'https://upload.example.com/file.mp4',
        upload_method: 'PUT',
      },
      error: null,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://upload.example.com/file.mp4',
          uploadMethod: 'PUT',
          cloudJobId: 'cloud-job-1',
        }),
        {
          status: 200,
        }
      )
    )
  })

  it('returns 400 for invalid JSON payload', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('returns 400 for validation errors', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: 'not-a-uuid',
        fileName: '',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('returns auth response when user is not authorized', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when ownership check fails', async () => {
    mockAssertMemorialOwnership.mockResolvedValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })

  it('returns 500 when upload job insert fails', async () => {
    mockJobInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
  })

  it('returns 503 when transcode service is not configured', async () => {
    mockIsVideoTranscodeConfigured.mockReturnValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns 503 when transcode upstream is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
  })

  it('returns 502 with upstream message when init call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'upstream init failed' }), {
        status: 502,
      })
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(502)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('upstream init failed')
  })

  it('returns 502 with fallback message when upstream body is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('oops', { status: 500 })
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(502)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('Unable to initialize video upload.')
  })

  it('returns 502 when transcode response shape is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ uploadMethod: 'PUT' }), { status: 200 })
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(502)
  })

  it('returns 500 when upload job update fails after successful init', async () => {
    mockJobUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('creates upload job and returns upload target on success', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
        title: 'Tribute',
      }),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(201)
    expect(mockJobInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440001',
        created_by: 'user-1',
      })
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://transcode.example.com/jobs/init',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'video.upload_init',
        entity: 'video_upload',
        metadata: expect.objectContaining({
          memorialId: '550e8400-e29b-41d4-a716-446655440001',
          fileSize: 139000000,
        }),
      })
    )
  })

  it('accepts pageId aliases and falls back to null title plus PUT when upstream omits optional fields', async () => {
    mockJobInsertSingle.mockResolvedValueOnce({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        page_id: '550e8400-e29b-41d4-a716-446655440001',
        created_by: 'user-1',
        status: 'queued',
        title: null,
        source_filename: 'tribute.mp4',
        source_mime: 'video/mp4',
        source_bytes: 139000000,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })
    mockJobUpdateSingle.mockResolvedValueOnce({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'uploading',
        upload_url: 'https://upload.example.com/file.mp4',
        upload_method: 'PUT',
      },
      error: null,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://upload.example.com/file.mp4',
        }),
        { status: 200 }
      )
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
      }),
    })
    const res = await POST(req as never)
    const body = (await res.json()) as {
      job: { uploadMethod: string }
    }

    expect(res.status).toBe(201)
    expect(mockAssertMemorialOwnership).toHaveBeenCalledWith(
      expect.anything(),
      '550e8400-e29b-41d4-a716-446655440001',
      'user-1',
      'editor'
    )
    expect(mockJobInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440001',
        title: null,
      })
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://transcode.example.com/jobs/init',
      expect.objectContaining({
        method: 'POST',
      })
    )
    const upstreamInit = vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as
      | RequestInit
      | undefined
    expect(JSON.parse(String(upstreamInit?.body))).toMatchObject({
      memorialId: '550e8400-e29b-41d4-a716-446655440001',
      pageId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(body.job.uploadMethod).toBe('PUT')
  })

  it('falls back to PUT when the persisted upload method is null', async () => {
    mockJobInsertSingle.mockResolvedValueOnce({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        page_id: '550e8400-e29b-41d4-a716-446655440001',
        created_by: 'user-1',
        status: 'queued',
        title: 'Tribute',
        source_filename: 'tribute.mp4',
        source_mime: 'video/mp4',
        source_bytes: 139000000,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })
    mockJobUpdateSingle.mockResolvedValueOnce({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'uploading',
        upload_url: 'https://upload.example.com/file.mp4',
        upload_method: null,
      },
      error: null,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://upload.example.com/file.mp4',
          uploadMethod: 'POST',
        }),
        { status: 200 }
      )
    )

    const req = new Request('http://localhost/api/admin/videos/uploads/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440001',
        fileName: 'tribute.mp4',
        fileSize: 139000000,
        mimeType: 'video/mp4',
        title: 'Tribute',
      }),
    })
    const res = await POST(req as never)
    const body = (await res.json()) as { job: { uploadMethod: string } }

    expect(res.status).toBe(201)
    expect(body.job.uploadMethod).toBe('PUT')
  })
})
