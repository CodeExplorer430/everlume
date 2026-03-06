import { DELETE, PATCH } from '@/app/api/admin/redirects/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockRedirectSingle = vi.fn()
const mockRedirectEqCreatedBy = vi.fn(() => ({ single: mockRedirectSingle }))
const mockRedirectEqId = vi.fn(() => ({ eq: mockRedirectEqCreatedBy }))
const mockRedirectSelect = vi.fn(() => ({ eq: mockRedirectEqId }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return {
        select: mockRedirectSelect,
        delete: mockDelete,
        update: mockUpdate,
      }
    },
  }),
}))

describe('/api/admin/redirects/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockRedirectSingle.mockReset()
    mockDeleteEq.mockReset()
    mockUpdate.mockClear()
    mockUpdateEq.mockClear()
    mockUpdateSelect.mockClear()
    mockUpdateSingle.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns forbidden for non-owner on delete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000', { method: 'DELETE' })
    const res = await DELETE(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(403)
  })

  it('deletes redirect for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000', { method: 'DELETE' })
    const res = await DELETE(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
  })

  it('rejects patch when no mutable fields are provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const req = new Request('http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(400)
  })

  it('updates redirect print status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'verified',
        last_verified_at: '2026-03-06T00:00:00.000Z',
        is_active: true,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ printStatus: 'verified' }),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ print_status: 'verified' }))
  })
})
