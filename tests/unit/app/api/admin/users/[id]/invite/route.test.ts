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
      admin: {
        inviteUserByEmail: mockInviteUserByEmail,
      },
    },
    from: () => ({
      select: () => ({ eq: mockTargetEq }),
      update: mockUpdate,
    }),
  }),
}))

describe('admin users [id] invite route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockUpdateSingle.mockReset()
    mockInviteUserByEmail.mockReset()
    mockUpdate.mockReset()
  })

  it('resends an invite email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({
      data: { id: 'user-2', email: 'invitee@example.com', full_name: 'Invitee', role: 'editor', is_active: true },
      error: null,
    })
    mockInviteUserByEmail.mockResolvedValue({ error: null })
    mockUpdateSingle.mockResolvedValue({ data: { id: 'user-2', email: 'invitee@example.com' }, error: null })

    const req = new Request('https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite', {
      method: 'POST',
    })

    const res = await POST(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(200)
    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      'invitee@example.com',
      expect.objectContaining({
        redirectTo: 'https://everlume.test/auth/callback?next=/login/reset-password',
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      user: { id: 'user-2', email: 'invitee@example.com', account_state: 'invited' },
      message: 'Invite email sent.',
    })
  })

  it('returns not found when the invite target does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({ data: null, error: { message: 'missing' } })

    const req = new Request('https://everlume.test/api/admin/users/550e8400-e29b-41d4-a716-446655440000/invite', {
      method: 'POST',
    })

    const res = await POST(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(404)
  })
})
