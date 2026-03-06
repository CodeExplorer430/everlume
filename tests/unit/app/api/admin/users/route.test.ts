import { GET, POST } from '@/app/api/admin/users/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfilesOrder = vi.fn()

const mockInvite = vi.fn()
const mockUpsertSingle = vi.fn()
const mockUpsertSelect = vi.fn(() => ({ single: mockUpsertSingle }))
const mockUpsert = vi.fn(() => ({ select: mockUpsertSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: (...args: unknown[]) => {
            if (args[0] === 'role, is_active') {
              return { eq: mockProfileEq }
            }

            return { order: mockProfilesOrder }
          },
        }
      }

      return { select: vi.fn() }
    },
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: mockInvite,
      },
    },
    from: () => ({
      upsert: mockUpsert,
    }),
  }),
}))

describe('admin users route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockProfilesOrder.mockReset()
    mockInvite.mockReset()
    mockUpsertSingle.mockReset()
  })

  it('GET returns unauthorized when signed out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns forbidden for non-admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('GET returns users for active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockProfilesOrder.mockResolvedValue({ data: [{ id: 'u1' }], error: null })

    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('POST invites and upserts user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockInvite.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
    mockUpsertSingle.mockResolvedValue({ data: { id: 'new-user-id' }, error: null })

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@everlume.test',
        fullName: 'New User',
        role: 'editor',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })
})
