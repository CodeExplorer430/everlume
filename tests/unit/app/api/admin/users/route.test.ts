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
const mockCreateServiceRoleClient = vi.fn()
const mockLogAdminAudit = vi.fn()

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
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
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
    mockCreateServiceRoleClient.mockReset()
    mockCreateServiceRoleClient.mockImplementation(() => ({
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
    }))
    mockLogAdminAudit.mockReset()
  })

  it('GET returns unauthorized when signed out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns forbidden for non-admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('GET returns users for active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: [{ id: 'u1', email: 'u1@test.dev', is_active: true }],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'u1', last_sign_in_at: null }] },
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockServiceProfilesOrder).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    await expect(res.json()).resolves.toEqual({
      users: [
        {
          id: 'u1',
          email: 'u1@test.dev',
          is_active: true,
          account_state: 'invited',
        },
      ],
    })
    expect(mockListUsers).toHaveBeenCalledTimes(1)
  })

  it('GET derives active and deactivated account states from auth users and profile flags', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: [
        { id: 'u1', email: 'active@test.dev', is_active: true },
        { id: 'u2', email: 'inactive@test.dev', is_active: false },
      ],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', last_sign_in_at: '2026-03-01T00:00:00.000Z' },
          { id: 'u2', last_sign_in_at: '2026-03-01T00:00:00.000Z' },
        ],
      },
      error: null,
    })

    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [
        {
          id: 'u1',
          email: 'active@test.dev',
          is_active: true,
          account_state: 'active',
        },
        {
          id: 'u2',
          email: 'inactive@test.dev',
          is_active: false,
          account_state: 'deactivated',
        },
      ],
    })
  })

  it('GET returns a configuration error when service-role auth is unavailable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockCreateServiceRoleClient.mockImplementation(() => {
      throw new Error('missing service role key')
    })

    const res = await GET()
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONFIG_ERROR',
    })
  })

  it('GET returns a database error when profile loading fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: null,
      error: { message: 'db failed' },
    })

    const res = await GET()
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to load users.',
    })
  })

  it('GET returns an empty user list when no profiles exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: [],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ users: [] })
  })

  it('GET falls back to active state when auth user lookup is unavailable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: [{ id: 'u1', email: 'u1@test.dev', is_active: true }],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: new Error('lookup failed'),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [
        {
          id: 'u1',
          email: 'u1@test.dev',
          is_active: true,
          account_state: 'active',
        },
      ],
    })
  })

  it('GET tolerates null profile and auth-user collections', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: null,
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: null,
      error: null,
    })

    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ users: [] })
  })

  it('GET treats a null auth user list as invited when profile rows are present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockServiceProfilesOrder.mockResolvedValue({
      data: [{ id: 'u1', email: 'u1@test.dev', is_active: true }],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: null,
      error: null,
    })

    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [
        {
          id: 'u1',
          email: 'u1@test.dev',
          is_active: true,
          account_state: 'invited',
        },
      ],
    })
  })

  it('POST invites and upserts user with a password setup redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockInvite.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockUpsertSingle.mockResolvedValue({
      data: { id: 'new-user-id', email: 'new@everlume.test' },
      error: null,
    })

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
        redirectTo:
          'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toEqual({
      user: {
        id: 'new-user-id',
        email: 'new@everlume.test',
        account_state: 'invited',
      },
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.create',
        entity: 'user',
        entityId: 'new-user-id',
      })
    )
  })

  it('POST returns unauthorized when signed out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

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

    expect(res.status).toBe(401)
    expect(mockInvite).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('POST returns a conflict when the email already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockInvite.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

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
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('POST returns 400 for invalid json and validation failures', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })

    const invalidJsonRequest = new Request(
      'https://everlume.test/api/admin/users',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )
    const invalidJsonResponse = await POST(invalidJsonRequest as never)
    expect(invalidJsonResponse.status).toBe(400)

    const invalidPayloadRequest = new Request(
      'https://everlume.test/api/admin/users',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'bad-email',
          fullName: 'X',
          role: 'viewer',
        }),
      }
    )
    const invalidPayloadResponse = await POST(invalidPayloadRequest as never)
    expect(invalidPayloadResponse.status).toBe(400)
    expect(mockInvite).not.toHaveBeenCalled()
  })

  it('POST returns a configuration error when service-role auth is unavailable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockCreateServiceRoleClient.mockImplementation(() => {
      throw new Error('missing service role key')
    })

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
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONFIG_ERROR',
    })
  })

  it('POST returns a database error when the invite provider fails generically', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockInvite.mockResolvedValue({
      data: { user: null },
      error: { message: 'provider down' },
    })

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
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to invite user right now.',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('POST returns a database error when profile upsert fails after invite success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockInvite.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockUpsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'upsert failed' },
    })

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
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to save invited user profile.',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
