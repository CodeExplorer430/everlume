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
    delete process.env.E2E_FAKE_AUTH
    delete process.env.E2E_ADMIN_ROLE
    vi.resetModules()
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
  })

  it('returns 401 when there is no authenticated user', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(401)
  })

  it('returns 403 when profile is missing', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: null, error: null })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns 403 when role is below minimum', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })

    const auth = await requireAdminUser({ minRole: 'admin' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns ok when role satisfies minimum', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    if (auth.ok) expect(auth.role).toBe('editor')
  })

  it('returns 403 when profile is inactive', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: false }, error: null })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('honors e2e bypass with sufficient role', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'
    process.env.E2E_ADMIN_ROLE = 'admin'
    const { requireAdminUser } = await import('@/lib/server/admin-auth')

    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(true)
  })

  it('denies e2e bypass when role is below minimum', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'
    process.env.E2E_ADMIN_ROLE = 'viewer'
    const { requireAdminUser } = await import('@/lib/server/admin-auth')

    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('honors fake e2e auth session when enabled', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'e2e-admin@everlume.local',
      role: 'admin',
      isActive: true,
      fullName: 'E2E Admin',
      state: 'active',
    })

    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(true)
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})
