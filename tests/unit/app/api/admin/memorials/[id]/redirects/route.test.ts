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
const mockIlike = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ ilike: mockIlike }))
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

describe('GET /api/admin/memorials/[id]/redirects', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockOrder.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects')
    const res = await GET(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(401)
  })

  it('returns redirects for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', slug: 'jane-doe' } })
    mockOrder.mockResolvedValue({ data: [{ id: 'r1' }], error: null })

    const req = new Request('http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/redirects')
    const res = await GET(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
  })
})
