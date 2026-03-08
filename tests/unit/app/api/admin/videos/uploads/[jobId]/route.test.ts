import { GET } from '@/app/api/admin/videos/uploads/[jobId]/route'

const mockRequireAdminUser = vi.fn()
const mockAssertMemorialOwnership = vi.fn()
const mockJobSingle = vi.fn()
const mockJobEq = vi.fn(() => ({ single: mockJobSingle }))
const mockJobSelect = vi.fn(() => ({ eq: mockJobEq }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  assertMemorialOwnership: (...args: unknown[]) => mockAssertMemorialOwnership(...args),
  forbidden: (message: string) => new Response(JSON.stringify({ code: 'FORBIDDEN', message }), { status: 403 }),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

describe('GET /api/admin/videos/uploads/[jobId]', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockAssertMemorialOwnership.mockReset()
    mockJobSingle.mockReset()
    mockJobEq.mockClear()
    mockJobSelect.mockClear()
  })

  it('returns 400 for invalid job id param', async () => {
    const req = new Request('http://localhost/api/admin/videos/uploads/not-a-uuid', { method: 'GET' })
    const res = await GET(req as never, { params: Promise.resolve({ jobId: 'not-a-uuid' }) })

    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('returns auth response when user is not authorized', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000', { method: 'GET' })
    const res = await GET(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(401)
  })

  it('returns 500 when upload job lookup fails', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'viewer',
      supabase: {
        from: () => ({ select: mockJobSelect }),
      },
    })
    mockJobSingle.mockResolvedValue({ data: null, error: { message: 'read failed' } })

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000', { method: 'GET' })
    const res = await GET(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(500)
  })

  it('returns 403 when user does not own the page', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'viewer',
      supabase: {
        from: () => ({ select: mockJobSelect }),
      },
    })
    mockJobSingle.mockResolvedValue({
      data: { id: 'job-1', page_id: 'page-1', status: 'queued' },
      error: null,
    })
    mockAssertMemorialOwnership.mockResolvedValue(false)

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000', { method: 'GET' })
    const res = await GET(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(403)
  })

  it('returns 200 with upload job payload for owner', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'viewer',
      supabase: {
        from: () => ({ select: mockJobSelect }),
      },
    })
    mockJobSingle.mockResolvedValue({
      data: {
        id: 'job-1',
        page_id: 'page-1',
        status: 'completed',
        title: 'Tribute video',
        source_filename: 'video.mp4',
        source_mime: 'video/mp4',
        source_bytes: 139000000,
        output_public_id: 'everlume/page/video-1',
        output_url: 'https://res.cloudinary.com/demo/video/upload/v1/everlume/page/video-1.mp4',
        output_bytes: 99000000,
        error_message: null,
        created_at: '2026-03-07T00:00:00.000Z',
        updated_at: '2026-03-07T00:01:00.000Z',
      },
      error: null,
    })
    mockAssertMemorialOwnership.mockResolvedValue(true)

    const req = new Request('http://localhost/api/admin/videos/uploads/550e8400-e29b-41d4-a716-446655440000', { method: 'GET' })
    const res = await GET(req as never, { params: Promise.resolve({ jobId: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { job: { id: string; status: string } }
    expect(body.job.id).toBe('job-1')
    expect(body.job.status).toBe('completed')
  })
})
