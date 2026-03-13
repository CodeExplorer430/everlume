import { DELETE, PATCH } from '@/app/api/admin/users/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))

const mockTargetSingle = vi.fn()
const mockTargetEq = vi.fn(() => ({ single: mockTargetSingle }))

const mockCountEqRole = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ count: 1 })),
}))
const mockListUsers = vi.fn()

const mockUpdateSingle = vi.fn()
const mockUpdateEq = vi.fn<
  () =>
    | { select: () => { single: typeof mockUpdateSingle } }
    | Promise<{ data: unknown; error: null }>
>(() => ({ select: () => ({ single: mockUpdateSingle }) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockCreateServiceRoleClient = vi.fn()
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table !== 'profiles') return { select: vi.fn(), update: vi.fn() }

      return {
        select: (
          columns: string,
          options?: { head?: boolean; count?: string }
        ) => {
          if (columns === 'role, is_active') return { eq: mockProfileEq }
          if (options?.head) return { eq: mockCountEqRole }
          return { eq: mockTargetEq }
        },
        update: mockUpdate,
      }
    },
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('admin users [id] route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockUpdateSingle.mockReset()
    mockUpdate.mockReset()
    mockListUsers.mockReset()
    mockCreateServiceRoleClient.mockReset()
    mockCreateServiceRoleClient.mockImplementation(() => ({
      auth: {
        admin: {
          listUsers: mockListUsers,
        },
      },
      from: (table: string) => {
        if (table !== 'profiles') return { select: vi.fn(), update: vi.fn() }
        return {
          select: (
            _columns: string,
            options?: { head?: boolean; count?: string }
          ) => {
            if (options?.head) return { eq: mockCountEqRole }
            return { eq: mockTargetEq }
          },
          update: mockUpdate,
        }
      },
    }))
    mockLogAdminAudit.mockReset()
  })

  it('returns forbidden for non-admin actors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'editor-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects cross-origin user patch requests before auth', async () => {
    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example',
        },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 409 when trying to deactivate last active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'admin-1', role: 'admin', is_active: true },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(409)
  })

  it('treats a missing active-admin count as zero when preventing admin role downgrades', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: true },
      error: null,
    })
    mockCountEqRole.mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ count: null })),
    } as never)

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(409)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid patch params and invalid json payloads', async () => {
    const invalidIdRequest = new Request(
      'http://localhost/api/admin/users/not-a-uuid',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const invalidIdResponse = await PATCH(invalidIdRequest as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(invalidIdResponse.status).toBe(400)

    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )

    const invalidJsonResponse = await PATCH(invalidJsonRequest as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(invalidJsonResponse.status).toBe(400)

    const invalidPayloadRequest = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName: 'X' }),
      }
    )

    const invalidPayloadResponse = await PATCH(invalidPayloadRequest as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(invalidPayloadResponse.status).toBe(400)
  })

  it('updates user role successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'editor', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: true },
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-2', last_sign_in_at: '2026-03-08T00:00:00.000Z' }],
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', role: 'viewer', account_state: 'active' },
      shouldSignOutSelf: false,
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.update',
        entity: 'user',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('preserves invited account state when an invited active user is updated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'editor',
        is_active: true,
        email: 'invitee@example.com',
        full_name: 'Invitee',
      },
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-2', last_sign_in_at: null }] },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'editor' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', role: 'editor', account_state: 'invited' },
    })
  })

  it('downgrades and reactivates an admin while clearing deactivated_at', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: true },
      error: null,
    })
    mockCountEqRole.mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ count: 2 })),
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'viewer',
        is_active: true,
        email: 'viewer@example.com',
        full_name: 'Viewer User',
      },
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-2', last_sign_in_at: '2026-03-08T00:00:00.000Z' }],
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer', isActive: true }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'viewer',
        is_active: true,
        deactivated_at: null,
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', role: 'viewer', account_state: 'active' },
    })
  })

  it('falls back to active account state when auth lookup is unavailable during patch', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'viewer',
        is_active: true,
        email: 'viewer@example.com',
        full_name: 'Viewer User',
      },
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: new Error('lookup failed'),
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName: 'Viewer User' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', account_state: 'active' },
    })
  })

  it('preserves the deactivated account state when an inactive user is updated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: false },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'editor',
        is_active: false,
        email: 'viewer@example.com',
        full_name: 'Viewer User',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'editor' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockListUsers).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', role: 'editor', account_state: 'deactivated' },
    })
  })

  it('returns self sign-out metadata when the current admin deactivates their own account', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
    })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'admin',
        is_active: true,
      },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'admin',
        is_active: false,
        email: 'admin@example.com',
        full_name: 'Admin User',
      },
      error: null,
    })
    mockCountEqRole.mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ count: 2 })),
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      shouldSignOutSelf: true,
      user: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        account_state: 'deactivated',
      },
    })
  })

  it('returns a configuration error when patch cannot create the service role client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockCreateServiceRoleClient.mockImplementation(() => {
      throw new Error('missing service role key')
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONFIG_ERROR',
    })
  })

  it('returns not found when patching a missing user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: null,
      error: { message: 'missing' },
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(404)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a database error when patch update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'editor', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('deletes/deactivates user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'viewer',
        is_active: false,
        email: 'user@example.com',
        full_name: 'User Two',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      shouldSignOutSelf: false,
      user: { id: 'user-2', account_state: 'deactivated' },
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.deactivate',
        entity: 'user',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('rejects cross-origin user delete requests before auth', async () => {
    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
        headers: {
          origin: 'https://evil.example',
        },
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when deleting a missing user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: null,
      error: { message: 'missing' },
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid delete params', async () => {
    const req = new Request('http://localhost/api/admin/users/not-a-uuid', {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 409 when trying to delete the last active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'admin-2', role: 'admin', is_active: true },
      error: null,
    })
    const activeAdminEq = vi.fn(() => Promise.resolve({ count: 1 }))
    mockCountEqRole.mockReturnValueOnce({ eq: activeAdminEq } as never)

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(409)
    expect(activeAdminEq).toHaveBeenCalledWith('is_active', true)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized for delete when the actor is signed out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a configuration error when delete cannot create the service role client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockCreateServiceRoleClient.mockImplementation(() => {
      throw new Error('missing service role key')
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONFIG_ERROR',
    })
  })

  it('returns 409 when deleting the last active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: true },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(409)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('treats a null active-admin count as zero when deleting an active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: true },
      error: null,
    })
    mockCountEqRole.mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ count: null })),
    } as never)

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(409)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns a database error when delete update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'viewer', is_active: true },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'delete failed' },
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('deactivates an already-inactive admin without re-running the last-admin count check', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: false },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'admin',
        is_active: false,
        email: 'user@example.com',
        full_name: 'User Two',
      },
      error: null,
    })
    mockCountEqRole.mockClear()

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockCountEqRole).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', account_state: 'deactivated' },
    })
  })

  it('deactivates an active admin when more than one active admin remains', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', role: 'admin', is_active: true },
      error: null,
    })
    mockCountEqRole.mockReturnValueOnce({
      eq: vi.fn(() => Promise.resolve({ count: 2 })),
    } as never)
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        role: 'admin',
        is_active: false,
        email: 'user@example.com',
        full_name: 'User Two',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', account_state: 'deactivated' },
    })
  })
})
