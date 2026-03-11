import { GET } from '@/app/api/admin/guestbook/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPagesEq = vi.fn()
const mockPagesSelect = vi.fn(() => ({ eq: mockPagesEq }))
const mockGuestbookOrder = vi.fn()
const mockGuestbookIn = vi.fn(() => ({ order: mockGuestbookOrder }))
const mockGuestbookSelect = vi.fn(() => ({ in: mockGuestbookIn }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'pages') {
        return { select: mockPagesSelect }
      }

      if (table === 'profiles') {
        return { select: mockProfileSelect }
      }

      if (table === 'guestbook') {
        return { select: mockGuestbookSelect }
      }

      return { select: vi.fn() }
    },
  }),
}))

describe('GET /api/admin/guestbook', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPagesEq.mockReset()
    mockGuestbookOrder.mockReset()
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

  it('returns entries for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPagesEq.mockResolvedValue({
      data: [{ id: 'page-1', title: 'My Page' }],
      error: null,
    })
    mockGuestbookOrder.mockResolvedValue({
      data: [
        {
          id: 'g1',
          name: 'Visitor',
          message: 'Hello',
          is_approved: false,
          created_at: '2026-01-01T00:00:00.000Z',
          page_id: 'page-1',
        },
      ],
      error: null,
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.entries).toHaveLength(1)
    expect(payload.entries[0].pages.title).toBe('My Page')
  })

  it('returns empty when no owned pages', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPagesEq.mockResolvedValue({ data: [], error: null })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.entries).toEqual([])
  })

  it('returns schema mismatch when pages query uses an outdated schema', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPagesEq.mockResolvedValue({ data: null, error: { code: '42703' } })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })

  it('returns schema mismatch when guestbook query uses an outdated schema', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPagesEq.mockResolvedValue({
      data: [{ id: 'page-1', title: 'My Page' }],
      error: null,
    })
    mockGuestbookOrder.mockResolvedValue({
      data: null,
      error: { code: '42P01' },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })
})
