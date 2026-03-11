import { GET } from '@/app/api/admin/memorials/[id]/redirects/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockOrder = vi.fn()
let mockRedirectsQuery: {
  eq: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  order: typeof mockOrder
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

describe('GET /api/admin/memorials/[id]/redirects', () => {
  beforeEach(() => {
    mockRedirectsQuery = {
      eq: vi.fn(() => mockRedirectsQuery),
      ilike: vi.fn(() => mockRedirectsQuery),
      order: mockOrder,
    }
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
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns redirects for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    mockOrder.mockResolvedValue({ data: [{ id: 'r1' }], error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
  })

  it('falls back to legacy redirect columns and normalizes memorial redirects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    mockOrder
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

  it('returns schema mismatch when the legacy fallback query still fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: { id: 'page-1', slug: 'jane-doe' },
    })
    mockOrder
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
})
