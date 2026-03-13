import { render, screen } from '@testing-library/react'

const mockAdminShell = vi.fn()
const mockRedirect = vi.fn<(url: string) => never>(() => {
  throw new Error('NEXT_REDIRECT')
})
const mockGetUser = vi.fn()
const mockCreateClient = vi.fn(async () => ({
  auth: {
    getUser: mockGetUser,
  },
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

vi.mock('@/components/admin/AdminShell', () => ({
  AdminShell: ({
    userEmail,
    children,
  }: {
    userEmail?: string
    children: React.ReactNode
  }) => {
    mockAdminShell({ userEmail, children })
    return <div data-testid="admin-shell">{children}</div>
  },
}))

describe('app/admin/layout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.E2E_BYPASS_ADMIN_AUTH
    delete process.env.E2E_FAKE_AUTH
    delete process.env.E2E_ADMIN_EMAIL
    mockAdminShell.mockReset()
    mockRedirect.mockClear()
    mockGetUser.mockReset()
    mockCreateClient.mockClear()
  })

  it('bypasses auth when E2E_BYPASS_ADMIN_AUTH is enabled', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'
    process.env.E2E_ADMIN_EMAIL = 'e2e@example.com'

    const mod = await import('@/app/admin/layout')
    const node = await mod.default({ children: <div>Admin child</div> })
    render(node)

    expect(screen.getByTestId('admin-shell')).toBeInTheDocument()
    expect(screen.getByText('Admin child')).toBeInTheDocument()
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockAdminShell).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'e2e@example.com' })
    )
  })

  it('uses the fallback bypass email when E2E_BYPASS_ADMIN_AUTH is enabled without an explicit email', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'

    const mod = await import('@/app/admin/layout')
    const node = await mod.default({ children: <div>Admin child</div> })
    render(node)

    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockAdminShell).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'e2e-admin@everlume.local',
      })
    )
  })

  it('redirects to /login when user is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const mod = await import('@/app/admin/layout')
    await expect(
      mod.default({ children: <div>Admin child</div> })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders AdminShell with authenticated user email', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'owner@example.com' } },
    })

    const mod = await import('@/app/admin/layout')
    const node = await mod.default({ children: <div>Admin child</div> })
    render(node)

    expect(screen.getByTestId('admin-shell')).toBeInTheDocument()
    expect(mockAdminShell).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'owner@example.com' })
    )
  })

  it('renders AdminShell from fake e2e auth session', async () => {
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

    const mod = await import('@/app/admin/layout')
    const node = await mod.default({ children: <div>Admin child</div> })
    render(node)

    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockAdminShell).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'fake@example.com' })
    )
  })

  it('redirects to /login when fake e2e auth session is inactive', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'fake@example.com',
      role: 'admin',
      isActive: false,
      fullName: 'Fake Admin',
      state: 'deactivated',
    })

    const mod = await import('@/app/admin/layout')
    await expect(
      mod.default({ children: <div>Admin child</div> })
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})
