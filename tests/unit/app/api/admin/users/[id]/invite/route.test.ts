import { POST } from '@/app/api/admin/users/[id]/invite/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))

const mockTargetSingle = vi.fn()
const mockTargetEq = vi.fn(() => ({ single: mockTargetSingle }))
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockInviteUserByEmail = vi.fn()
const mockCreateServiceRoleClient = vi.fn()
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table !== 'profiles') return { select: vi.fn() }
      return {
        select: (columns: string) =>
          columns === 'role, is_active'
            ? { eq: mockProfileEq }
            : { eq: mockTargetEq },
      }
    },
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () =>
    mockCreateServiceRoleClient() || {
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
        },
      },
      from: () => ({
        select: () => ({ eq: mockTargetEq }),
        update: mockUpdate,
      }),
    },
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('admin users [id] invite route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockUpdateSingle.mockReset()
    mockInviteUserByEmail.mockReset()
    mockUpdate.mockReset()
    mockCreateServiceRoleClient.mockReset()
    mockCreateServiceRoleClient.mockImplementation(() => ({
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
        },
      },
      from: () => ({
        select: () => ({ eq: mockTargetEq }),
        update: mockUpdate,
      }),
    }))
    mockLogAdminAudit.mockReset()
  })

  it('returns 400 for invalid params', async () => {
    const req = new Request(
      'https://everlume.test/api/admin/users/not-a-uuid/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
  })

  it('returns forbidden for non-admin actors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'editor-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('resends an invite email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'invitee@example.com',
        full_name: 'Invitee',
        role: 'editor',
        is_active: true,
      },
      error: null,
    })
    mockInviteUserByEmail.mockResolvedValue({ error: null })
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'user-2', email: 'invitee@example.com' },
      error: null,
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      'invitee@example.com',
      expect.objectContaining({
        redirectTo:
          'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      user: {
        id: 'user-2',
        email: 'invitee@example.com',
        account_state: 'invited',
      },
      message: 'Invite email sent.',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.invite.resend',
        entity: 'user',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns not found when the invite target does not exist', async () => {
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
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns a configuration error when the service role client cannot be created', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockCreateServiceRoleClient.mockImplementation(() => {
      throw new Error('missing service role key')
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONFIG_ERROR',
    })
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
  })

  it('returns a database error when the invite provider fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'invitee@example.com',
        full_name: 'Invitee',
        role: 'editor',
        is_active: true,
      },
      error: null,
    })
    mockInviteUserByEmail.mockResolvedValue({
      error: { message: 'provider down' },
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a database error when invite status cannot be updated after sending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'invitee@example.com',
        full_name: 'Invitee',
        role: 'editor',
        is_active: true,
      },
      error: null,
    })
    mockInviteUserByEmail.mockResolvedValue({ error: null })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
