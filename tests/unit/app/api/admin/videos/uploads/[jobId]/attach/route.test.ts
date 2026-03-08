import { POST } from '@/app/api/admin/videos/uploads/[jobId]/attach/route'

const mockRequireAdminUser = vi.fn()
const mockAssertMemorialOwnership = vi.fn()
const mockLogAdminAudit = vi.fn()

const mockJobSingle = vi.fn()
const mockJobEq = vi.fn(() => ({ single: mockJobSingle }))
const mockJobSelect = vi.fn(() => ({ eq: mockJobEq }))
const mockJobUpdateEq = vi.fn()
const mockJobUpdate = vi.fn(() => ({ eq: mockJobUpdateEq }))

const mockVideoInsertSingle = vi.fn()
const mockVideoInsertSelect = vi.fn(() => ({ single: mockVideoInsertSingle }))
const mockVideoInsert = vi.fn(() => ({ select: mockVideoInsertSelect }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  assertMemorialOwnership: (...args: unknown[]) => mockAssertMemorialOwnership(...args),
  forbidden: (message: string) => new Response(JSON.stringify({ code: 'FORBIDDEN', message }), { status: 403 }),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/videos/uploads/[jobId]/attach', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockAssertMemorialOwnership.mockReset()
    mockLogAdminAudit.mockReset()

    mockJobSingle.mockReset()
    mockJobUpdateEq.mockReset()
    mockJobEq.mockClear()
    mockJobSelect.mockClear()
    mockJobUpdate.mockClear()

    mockVideoInsertSingle.mockReset()
    mockVideoInsertSelect.mockClear()
    mockVideoInsert.mockClear()

    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'video_upload_jobs') {
            return {
              select: mockJobSelect,
              update: mockJobUpdate,
            }
          }

          if (table === 'videos') {
            return {
              insert: mockVideoInsert,
            }
          }

          return {}
        },
      },
    })
    mockAssertMemorialOwnership.mockResolvedValue(true)
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'completed',
        title: 'Tribute video',
        output_public_id: 'everlume/page/video-1',
      },
      error: null,
    })
    mockVideoInsertSingle.mockResolvedValue({
      data: {
        id: 'video-1',
        provider: 'cloudinary',
        provider_id: 'everlume/page/video-1',
        title: 'Tribute video',
        created_at: '2026-03-07T00:00:00.000Z',
      },
      error: null,
    })
    mockJobUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 400 for invalid job id param', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/not-a-uuid/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: 'not-a-uuid' }) })

    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('returns auth response when user is not authorized', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(401)
  })

  it('returns 500 when upload job lookup fails', async () => {
    mockJobSingle.mockResolvedValue({ data: null, error: { message: 'read failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
  })

  it('returns 403 when user does not own memorial', async () => {
    mockAssertMemorialOwnership.mockResolvedValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(403)
  })

  it('returns 409 when job status is not completed', async () => {
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'processing',
        output_public_id: 'everlume/page/video-1',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(409)
  })

  it('returns 409 when output public id is missing', async () => {
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'completed',
        output_public_id: null,
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(409)
  })

  it('returns 500 when video insert fails', async () => {
    mockVideoInsertSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
    expect(mockJobUpdate).not.toHaveBeenCalled()
  })

  it('returns 500 when upload job update fails', async () => {
    mockJobUpdateEq.mockResolvedValue({ error: { message: 'update failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 201, attaches video, updates job, and writes audit entries on success', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000/attach', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(201)
    expect(mockVideoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: 'page-1',
        provider: 'cloudinary',
        provider_id: 'everlume/page/video-1',
      })
    )
    expect(mockJobUpdate).toHaveBeenCalledWith({ status: 'attached' })
    expect(mockLogAdminAudit).toHaveBeenCalledTimes(2)
    expect(mockLogAdminAudit).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        action: 'video.upload_attach',
        entity: 'video_upload',
      })
    )
    expect(mockLogAdminAudit).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        action: 'video.create',
        entity: 'video',
      })
    )
  })
})
