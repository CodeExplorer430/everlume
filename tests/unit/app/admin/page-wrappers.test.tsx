import { render, screen } from '@testing-library/react'

const mockAdminDashboardView = vi.fn()
const mockGuestbookModerationScreen = vi.fn()
const mockNewMemorialForm = vi.fn()
const mockAdminSettingsScreen = vi.fn()
const mockUserManagementScreen = vi.fn()
const mockEditMemorialScreen = vi.fn()
const mockRedirect = vi.fn()

const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockCreateClient = vi.fn(async () => ({ from: mockFrom }))

vi.mock('@/components/pages/admin/AdminDashboardView', () => ({
  AdminDashboardView: (props: unknown) => {
    mockAdminDashboardView(props)
    return <div data-testid="admin-dashboard-view" />
  },
}))

vi.mock('@/components/pages/admin/GuestbookModerationScreen', () => ({
  GuestbookModerationScreen: () => {
    mockGuestbookModerationScreen()
    return <div data-testid="guestbook-moderation-screen" />
  },
}))

vi.mock('@/components/pages/admin/NewMemorialForm', () => ({
  NewMemorialForm: () => {
    mockNewMemorialForm()
    return <div data-testid="new-memorial-form" />
  },
}))

vi.mock('@/components/pages/admin/AdminSettingsScreen', () => ({
  AdminSettingsScreen: () => {
    mockAdminSettingsScreen()
    return <div data-testid="admin-settings-screen" />
  },
}))

vi.mock('@/components/pages/admin/UserManagementScreen', () => ({
  UserManagementScreen: () => {
    mockUserManagementScreen()
    return <div data-testid="user-management-screen" />
  },
}))

vi.mock('@/components/pages/admin/EditMemorialScreen', () => ({
  EditMemorialScreen: ({ memorialId }: { memorialId: string }) => {
    mockEditMemorialScreen(memorialId)
    return <div data-testid="edit-memorial-screen">{memorialId}</div>
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

describe('Admin page wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.E2E_FAKE_AUTH
    mockAdminDashboardView.mockReset()
    mockGuestbookModerationScreen.mockReset()
    mockNewMemorialForm.mockReset()
    mockAdminSettingsScreen.mockReset()
    mockUserManagementScreen.mockReset()
    mockEditMemorialScreen.mockReset()
    mockRedirect.mockReset()
    mockOrder.mockReset()
    mockSelect.mockClear()
    mockFrom.mockClear()
    mockCreateClient.mockClear()
  })

  it('loads admin dashboard pages and passes them to AdminDashboardView', async () => {
    const pages = [{ id: 'p1', title: 'Jane', slug: 'jane', created_at: '2026-01-01T00:00:00.000Z' }]
    mockOrder.mockResolvedValue({ data: pages })

    const mod = await import('@/app/admin/page')
    const node = await mod.default()
    render(node)

    expect(mockCreateClient).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalledWith('pages')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(screen.getByTestId('admin-dashboard-view')).toBeInTheDocument()
    expect(mockAdminDashboardView).toHaveBeenCalledWith({ pages })
  })

  it('skips the supabase query for the admin dashboard in fake auth mode', async () => {
    process.env.E2E_FAKE_AUTH = '1'

    const mod = await import('@/app/admin/page')
    const node = await mod.default()
    render(node)

    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockAdminDashboardView).toHaveBeenCalledWith({ pages: [] })
    delete process.env.E2E_FAKE_AUTH
  })

  it('renders guestbook moderation wrapper page', async () => {
    const mod = await import('@/app/admin/guestbook/page')
    const node = mod.default()
    render(node)

    expect(screen.getByTestId('guestbook-moderation-screen')).toBeInTheDocument()
    expect(mockGuestbookModerationScreen).toHaveBeenCalled()
  })

  it('renders new memorial wrapper page', async () => {
    const mod = await import('@/app/admin/memorials/new/page')
    const node = mod.default()
    render(node)

    expect(screen.getByTestId('new-memorial-form')).toBeInTheDocument()
    expect(mockNewMemorialForm).toHaveBeenCalled()
  })

  it('renders admin settings wrapper page', async () => {
    const mod = await import('@/app/admin/settings/page')
    const node = mod.default()
    render(node)

    expect(screen.getByTestId('admin-settings-screen')).toBeInTheDocument()
    expect(mockAdminSettingsScreen).toHaveBeenCalled()
  })

  it('renders user management wrapper page', async () => {
    const mod = await import('@/app/admin/users/page')
    const node = mod.default()
    render(node)

    expect(screen.getByTestId('user-management-screen')).toBeInTheDocument()
    expect(mockUserManagementScreen).toHaveBeenCalled()
  })

  it('renders edit memorial wrapper page', async () => {
    const mod = await import('@/app/admin/memorials/[id]/page')
    const node = await mod.default({ params: Promise.resolve({ id: 'page-123' }) })
    render(node)

    expect(screen.getByTestId('edit-memorial-screen')).toBeInTheDocument()
    expect(mockEditMemorialScreen).toHaveBeenCalledWith('page-123')
  })

  it('redirects legacy admin pages/[id] route to memorials path', async () => {
    const mod = await import('@/app/admin/pages/[id]/page')
    await mod.default({ params: Promise.resolve({ id: 'page-123' }) })

    expect(mockRedirect).toHaveBeenCalledWith('/admin/memorials/page-123')
  })
})
