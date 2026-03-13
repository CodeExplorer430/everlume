import { GET } from '@/app/api/admin/memorials/[id]/guestbook/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      return { select: mockSelect }
    },
  }),
}))

describe('GET /api/admin/memorials/[id]/guestbook', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockOrder.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid params', async () => {
    const req = new Request(
      'http://localhost/api/admin/memorials/not-a-uuid/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns forbidden for non-owners', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns guestbook entries for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockOrder.mockResolvedValue({ data: [{ id: 'g1' }], error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith(
      'page_id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns an empty guestbook list when no entries exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockOrder.mockResolvedValue({ data: [], error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ entries: [] })
  })

  it('normalizes null guestbook data to an empty list', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockOrder.mockResolvedValue({ data: null, error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ entries: [] })
  })

  it('returns a database error when guestbook loading fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockOrder.mockResolvedValue({ data: null, error: { message: 'db failed' } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/guestbook'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(500)
  })
})
