import { GET } from '@/app/api/admin/memorials/[id]/redirects/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({
  eq: mockPageEqOwner,
  single: mockPageSingle,
}))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

let mockRedirectsQuery: {
  eq: ReturnType<typeof vi.fn>
  ilike?: ReturnType<typeof vi.fn>
  order?: ReturnType<typeof vi.fn>
  data?: Array<Record<string, unknown>> | null
  error?: { code?: string; message?: string } | null
}
const mockSelect = vi.fn(() => mockRedirectsQuery)

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

function createOrderedRedirectQuery() {
  const query: typeof mockRedirectsQuery = {
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    order: vi.fn(),
  }
  return query
}

function getRedirectOrderMock() {
  const order = mockRedirectsQuery.order
  if (!order) {
    throw new Error('Expected redirects order mock to exist.')
  }
  return order
}

describe('GET /api/admin/memorials/[id]/redirects', () => {
  beforeEach(() => {
    mockRedirectsQuery = createOrderedRedirectQuery()
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockPageEqId.mockClear()
    mockPageEqOwner.mockClear()
    mockSelect.mockClear()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns validation error for an invalid memorial id', async () => {
    const req = new Request(
      'http://localhost/api/admin/memorials/not-a-uuid/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns forbidden when the user does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockPageEqOwner).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns redirects for owner and preserves owner-scoped query shape', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock()).mockResolvedValue({
      data: [
        {
          id: 'r1',
          shortcode: 'jane',
          target_url: 'https://example.com/memorials/jane-doe',
          print_status: 'verified',
          last_verified_at: '2026-01-04T00:00:00.000Z',
          is_active: true,
          created_at: '2026-01-04T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockPageEqId).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockPageEqOwner).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(mockRedirectsQuery.ilike).toHaveBeenCalledWith(
      'target_url',
      '%jane-doe%'
    )
    expect(mockRedirectsQuery.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(mockRedirectsQuery.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
  })

  it('does not owner-scope redirect queries for admin users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock()).mockResolvedValue({
      data: [],
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockPageEqOwner).not.toHaveBeenCalled()
    expect(mockRedirectsQuery.eq).not.toHaveBeenCalledWith(
      'created_by',
      'admin-1'
    )
  })

  it('falls back to legacy redirect columns and normalizes memorial redirects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock())
      .mockResolvedValueOnce({ data: null, error: { code: '42703' } })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'r1',
            shortcode: 'jane',
            target_url: 'https://example.com/memorials/jane-doe',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.redirects).toEqual([
      {
        id: 'r1',
        shortcode: 'jane',
        target_url: 'https://example.com/memorials/jane-doe',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ])
  })

  it('returns normalized redirects when ilike and order are unavailable', async () => {
    const query = {
      data: [
        {
          id: 'r1',
          shortcode: 'jane',
          target_url: 'https://example.com/memorials/jane-doe',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    }
    mockRedirectsQuery = {
      ...query,
      eq: vi.fn(() => mockRedirectsQuery),
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(mockRedirectsQuery.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(payload.redirects).toEqual([
      {
        id: 'r1',
        shortcode: 'jane',
        target_url: 'https://example.com/memorials/jane-doe',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ])
  })

  it('normalizes null redirect query data to an empty list', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock()).mockResolvedValue({
      data: null,
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.redirects).toEqual([])
  })

  it('falls back to legacy columns even when ilike and order are unavailable on the fallback query', async () => {
    const primaryQuery = createOrderedRedirectQuery()
    primaryQuery.order = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { code: '42703' },
    })
    mockRedirectsQuery = primaryQuery

    const fallbackQuery = {
      eq: vi.fn(),
      data: [
        {
          id: 'r2',
          shortcode: 'legacy',
          target_url: 'https://example.com/memorials/jane-doe',
          created_at: '2026-01-02T00:00:00Z',
        },
      ],
      error: null,
    }
    fallbackQuery.eq.mockReturnValue(fallbackQuery)
    mockSelect
      .mockImplementationOnce(() => mockRedirectsQuery)
      .mockImplementationOnce(() => fallbackQuery)

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(fallbackQuery.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(payload.redirects).toEqual([
      {
        id: 'r2',
        shortcode: 'legacy',
        target_url: 'https://example.com/memorials/jane-doe',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-02T00:00:00Z',
      },
    ])
  })

  it('returns schema mismatch when the legacy fallback query still fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock())
      .mockResolvedValueOnce({ data: null, error: { code: '42703' } })
      .mockResolvedValueOnce({ data: null, error: { code: '42P01' } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })

  it('returns a database error for non-schema redirect query failures', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    vi.mocked(getRedirectOrderMock()).mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to load redirects.',
    })
  })
})
