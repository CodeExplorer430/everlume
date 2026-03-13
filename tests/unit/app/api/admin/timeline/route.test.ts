import { POST } from '@/app/api/admin/timeline/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockEventSingle = vi.fn()
const mockEventSelect = vi.fn(() => ({ single: mockEventSingle }))
const mockEventInsert = vi.fn(() => ({ select: mockEventSelect }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      return { insert: mockEventInsert }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/timeline', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockEventSingle.mockReset()
    mockEventInsert.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns validation errors for invalid json and missing memorial ids', async () => {
    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/timeline',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )

    const invalidJsonResponse = await POST(invalidJsonRequest as never)
    expect(invalidJsonResponse.status).toBe(400)

    const missingMemorialRequest = new Request(
      'http://localhost/api/admin/timeline',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          year: 1990,
          text: 'Born',
        }),
      }
    )

    const missingMemorialResponse = await POST(missingMemorialRequest as never)
    expect(missingMemorialResponse.status).toBe(400)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/admin/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns forbidden when the editor does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/admin/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
    expect(mockEventInsert).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('creates timeline event for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockEventSingle.mockResolvedValue({
      data: {
        id: 'evt-1',
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockEventInsert).toHaveBeenCalledWith({
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      year: 1990,
      text: 'Born',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'timeline.create',
        entity: 'timeline',
        entityId: 'evt-1',
      })
    )
  })

  it('accepts pageId as the memorial identifier alias', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockEventSingle.mockResolvedValue({
      data: {
        id: 'evt-1',
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockEventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns a database error when the insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockEventSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })

    const req = new Request('http://localhost/api/admin/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        year: 1990,
        text: 'Born',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
