import { POST } from '@/app/auth/signout/route'

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

describe('POST /auth/signout', () => {
  beforeEach(() => {
    delete process.env.E2E_FAKE_AUTH
    mockGetUser.mockReset()
    mockSignOut.mockReset()
    mockRevalidatePath.mockReset()
  })

  it('redirects to /login without signing out when no user is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/auth/signout', { method: 'POST' })
    const res = await POST(req as never)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost/login')
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('signs out authenticated user and redirects to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSignOut.mockResolvedValue({})

    const req = new Request('http://localhost/auth/signout', { method: 'POST' })
    const res = await POST(req as never)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost/login')
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('clears fake e2e auth sessions without calling supabase signOut', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'fake@example.com',
      role: 'admin',
      isActive: true,
      fullName: 'Fake Admin',
      state: 'active',
    })

    const req = new Request('http://localhost/auth/signout', { method: 'POST' })
    const res = await POST(req as never)

    expect(res.status).toBe(302)
    expect(res.cookies.get('everlume_e2e_auth')?.value).toBe('')
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
