import { POST } from '@/app/api/admin/users/[id]/reset-password/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockTargetSingle = vi.fn()
const mockTargetEq = vi.fn(() => ({ single: mockTargetSingle }))
const mockResetPasswordForEmail = vi.fn()
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
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('admin users [id] reset-password route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockResetPasswordForEmail.mockReset()
    mockCreateServiceRoleClient.mockReset()
    mockCreateServiceRoleClient.mockImplementation(() => ({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
      from: () => ({
        select: () => ({ eq: mockTargetEq }),
      }),
    }))
    mockLogAdminAudit.mockReset()
  })

  it('returns 400 for invalid params', async () => {
    const req = new Request(
      'https://everlume.test/api/admin/users/not-a-uuid/reset-password',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('returns forbidden for non-admin actors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'editor-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('sends a password reset email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'invitee@example.com',
        role: 'editor',
        is_active: true,
      },
      error: null,
    })
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'invitee@example.com',
      expect.objectContaining({
        redirectTo:
          'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      message: 'Password reset email sent.',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.password.reset',
        entity: 'user',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns not found when the reset target does not exist', async () => {
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
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password',
      {
        method: 'POST',
      }
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(404)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
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
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password',
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
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('returns a database error when the reset provider fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockTargetSingle.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'invitee@example.com',
        role: 'editor',
        is_active: true,
      },
      error: null,
    })
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'provider failed' },
    })

    const req = new Request(
      'https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password',
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
