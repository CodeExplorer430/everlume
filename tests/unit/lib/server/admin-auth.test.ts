import { requireAdminUser } from '@/lib/server/admin-auth'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return {}
    },
  }),
}))

describe('requireAdminUser', () => {
  beforeEach(() => {
    delete process.env.E2E_BYPASS_ADMIN_AUTH
    delete process.env.E2E_ADMIN_ROLE
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
  })

  it('returns 401 when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(401)
  })

  it('returns 403 when profile is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: null, error: null })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns 403 when role is below minimum', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })

    const auth = await requireAdminUser({ minRole: 'admin' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns ok when role satisfies minimum', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    if (auth.ok) expect(auth.role).toBe('editor')
  })
})
