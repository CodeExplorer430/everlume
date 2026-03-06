import { POST } from '@/app/api/admin/redirects/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockInsertSelectSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSelectSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return { insert: mockInsert }
    },
  }),
}))

describe('POST /api/admin/redirects', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockInsert.mockClear()
    mockInsertSelect.mockClear()
    mockInsertSelectSingle.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shortcode: 'grandma', targetUrl: 'https://example.com/memorials/x' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('creates redirect with valid payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/x',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shortcode: 'Grandma', targetUrl: 'https://example.com/memorials/x' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith({
      shortcode: 'grandma',
      target_url: 'https://example.com/memorials/x',
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_by: 'user-1',
    })
  })
})
