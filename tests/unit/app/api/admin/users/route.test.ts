import { GET, POST } from '@/app/api/admin/users/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfilesOrder = vi.fn()

const mockInvite = vi.fn()
const mockListUsers = vi.fn()
const mockServiceProfilesOrder = vi.fn()
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
            if (args[0] === 'role, is_active') return { eq: mockProfileEq }
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
        listUsers: mockListUsers,
      },
    },
    from: () => ({
      select: () => ({ order: mockServiceProfilesOrder }),
      upsert: mockUpsert,
    }),
  }),
}))

describe('admin users route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockProfilesOrder.mockReset()
    mockServiceProfilesOrder.mockReset()
    mockInvite.mockReset()
    mockListUsers.mockReset()
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
    mockServiceProfilesOrder.mockResolvedValue({ data: [{ id: 'u1', email: 'u1@test.dev', is_active: true }], error: null })
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', last_sign_in_at: null }] }, error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [{ id: 'u1', email: 'u1@test.dev', is_active: true, account_state: 'invited' }],
    })
  })

  it('GET falls back to active state when auth user lookup is unavailable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockServiceProfilesOrder.mockResolvedValue({ data: [{ id: 'u1', email: 'u1@test.dev', is_active: true }], error: null })
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: new Error('lookup failed') })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [{ id: 'u1', email: 'u1@test.dev', is_active: true, account_state: 'active' }],
    })
  })

  it('POST invites and upserts user with a password setup redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockInvite.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
    mockUpsertSingle.mockResolvedValue({ data: { id: 'new-user-id', email: 'new@everlume.test' }, error: null })

    const req = new Request('https://everlume.test/api/admin/users', {
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
    expect(mockInvite).toHaveBeenCalledWith(
      'new@everlume.test',
      expect.objectContaining({
        redirectTo: 'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toEqual({
      user: { id: 'new-user-id', email: 'new@everlume.test', account_state: 'invited' },
    })
  })

  it('POST returns a conflict when the email already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockInvite.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })

    const req = new Request('https://everlume.test/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@everlume.test',
        fullName: 'Existing User',
        role: 'viewer',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: 'EMAIL_EXISTS',
    })
  })
})
