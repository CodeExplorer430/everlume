import { POST } from '@/app/api/admin/videos/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockVideoSingle = vi.fn()
const mockVideoSelect = vi.fn(() => ({ single: mockVideoSingle }))
const mockVideoInsert = vi.fn(() => ({ select: mockVideoSelect }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      return { insert: mockVideoInsert }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/videos', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockVideoSingle.mockReset()
    mockVideoInsert.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns validation errors for invalid json and missing memorial ids', async () => {
    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/videos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )

    const invalidJsonResponse = await POST(invalidJsonRequest as never)
    expect(invalidJsonResponse.status).toBe(400)

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
    expect(mockVideoInsert).not.toHaveBeenCalled()
  })

  it('returns invalid video url for non-youtube links that still pass schema validation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/video',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'INVALID_VIDEO_URL',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('creates youtube video for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockVideoSingle.mockResolvedValue({
      data: { id: 'v1', provider_id: 'abcdefghijk', title: 'Clip' },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
        title: 'Clip',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockVideoInsert).toHaveBeenCalledWith({
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'youtube',
      provider_id: 'abcdefghijk',
      title: 'Clip',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'video.create',
        entity: 'video',
        entityId: 'v1',
      })
    )
  })

  it('accepts pageId as the memorial identifier alias', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockVideoSingle.mockResolvedValue({
      data: { id: 'v1', provider_id: 'abcdefghijk', title: null },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://youtu.be/abcdefghijk',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockVideoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        provider_id: 'abcdefghijk',
      })
    )
  })

  it('returns forbidden when the editor does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
    expect(mockVideoInsert).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a database error when the insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockVideoSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
