import { POST } from '@/app/api/admin/users/[id]/reset-password/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockTargetSingle = vi.fn()
const mockTargetEq = vi.fn(() => ({ single: mockTargetSingle }))
const mockResetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table !== 'profiles') return { select: vi.fn() }
      return {
        select: (columns: string) => (columns === 'role, is_active' ? { eq: mockProfileEq } : { eq: mockTargetEq }),
      }
    },
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
    from: () => ({
      select: () => ({ eq: mockTargetEq }),
    }),
  }),
}))

describe('admin users [id] reset-password route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockResetPasswordForEmail.mockReset()
  })

  it('sends a password reset email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', email: 'invitee@example.com', role: 'editor', is_active: true },
      error: null,
    })
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    const req = new Request('https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password', {
      method: 'POST',
    })

    const res = await POST(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(200)
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'invitee@example.com',
      expect.objectContaining({
        redirectTo: 'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      message: 'Password reset email sent.',
    })
  })

  it('returns not found when the reset target does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({ data: null, error: { message: 'missing' } })

    const req = new Request('https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password', {
      method: 'POST',
    })

    const res = await POST(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(404)
  })
})
