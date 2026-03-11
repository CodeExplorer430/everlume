import { GET } from '@/app/api/admin/redirects/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockOrder = vi.fn()
let mockRedirectsQuery: {
  eq: ReturnType<typeof vi.fn>
  order: typeof mockOrder
}
const mockSelect = vi.fn(() => mockRedirectsQuery)

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return { select: mockSelect }
    },
  }),
}))

describe('GET /api/admin/redirects', () => {
  beforeEach(() => {
    mockRedirectsQuery = {
      eq: vi.fn(() => mockRedirectsQuery),
      order: mockOrder,
    }
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockOrder.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns redirects for user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockOrder.mockResolvedValue({ data: [{ id: 'r1' }], error: null })

    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns schema mismatch when redirects query uses an outdated schema', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockOrder.mockResolvedValue({ data: null, error: { code: '42703' } })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })

  it('normalizes redirect rows when optional columns are absent', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'r1',
          shortcode: 'legacy-link',
          target_url: 'https://example.com/memorials/x',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.redirects).toEqual([
      {
        id: 'r1',
        shortcode: 'legacy-link',
        target_url: 'https://example.com/memorials/x',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ])
  })
})
