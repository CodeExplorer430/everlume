const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockLegacyProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockLegacyProfileEq = vi.fn(() => ({ single: mockLegacyProfileSingle }))
const mockProfileSelect = vi.fn((columns?: string) => {
  if (columns === 'role') return { eq: mockLegacyProfileEq }
  return { eq: mockProfileEq }
})
const mockPageSingle = vi.fn()
const mockPageOwnerEq = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEq = vi.fn(() => ({
  eq: mockPageOwnerEq,
  single: mockPageSingle,
}))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEq }))
const mockRowSingle = vi.fn()
const mockRowEq = vi.fn(() => ({ single: mockRowSingle }))
const mockRowSelect = vi.fn(() => ({ eq: mockRowEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      if (
        table === 'guestbook' ||
        table === 'timeline_events' ||
        table === 'videos' ||
        table === 'photos'
      ) {
        return { select: mockRowSelect }
      }
      return {}
    },
  }),
}))

describe('requireAdminUser', () => {
  beforeEach(() => {
    delete process.env.E2E_BYPASS_ADMIN_AUTH
    delete process.env.E2E_FAKE_AUTH
    delete process.env.E2E_ADMIN_ROLE
    vi.resetModules()
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockLegacyProfileSingle.mockReset()
    mockProfileEq.mockClear()
    mockLegacyProfileEq.mockClear()
    mockProfileSelect.mockClear()
    mockPageSingle.mockReset()
    mockPageEq.mockClear()
    mockPageOwnerEq.mockClear()
    mockPageSelect.mockClear()
    mockRowSingle.mockReset()
    mockRowEq.mockClear()
    mockRowSelect.mockClear()
  })

  it('returns 401 when there is no authenticated user', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(401)
  })

  it('returns 403 when profile is missing', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: null, error: null })
    mockLegacyProfileSingle.mockResolvedValue({ data: null, error: null })

    const auth = await requireAdminUser()

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns 403 when role is below minimum', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'admin' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('returns ok when role satisfies minimum', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    if (auth.ok) expect(auth.role).toBe('editor')
  })

  it('returns 403 when profile is inactive', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: false },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('honors e2e bypass with sufficient role', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'
    process.env.E2E_ADMIN_ROLE = 'admin'
    const { requireAdminUser } = await import('@/lib/server/admin-auth')

    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(true)
  })

  it('denies e2e bypass when role is below minimum', async () => {
    process.env.E2E_BYPASS_ADMIN_AUTH = '1'
    process.env.E2E_ADMIN_ROLE = 'viewer'
    const { requireAdminUser } = await import('@/lib/server/admin-auth')

    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('honors fake e2e auth session when enabled', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'e2e-admin@everlume.local',
      role: 'admin',
      isActive: true,
      fullName: 'E2E Admin',
      state: 'active',
    })

    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    const auth = await requireAdminUser({ minRole: 'editor' })

    expect(auth.ok).toBe(true)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('falls back to the legacy profile lookup when is_active is unavailable', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: null,
      error: { message: 'missing is_active column' },
    })
    mockLegacyProfileSingle.mockResolvedValue({
      data: { role: 'viewer' },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    expect(mockProfileSelect).toHaveBeenCalledWith('role, is_active')
    expect(mockProfileSelect).toHaveBeenCalledWith('role')
  })

  it('falls back to the legacy lookup when the primary profile role is empty', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: '', is_active: true },
      error: null,
    })
    mockLegacyProfileSingle.mockResolvedValue({
      data: { role: 'viewer' },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    if (auth.ok) expect(auth.role).toBe('viewer')
  })

  it('returns 403 when the legacy profile role is empty', async () => {
    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: null,
      error: { message: 'missing is_active column' },
    })
    mockLegacyProfileSingle.mockResolvedValue({
      data: { role: '' },
      error: null,
    })

    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
  })

  it('denies fake e2e auth sessions when the account is inactive', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'e2e-admin@everlume.local',
      role: 'admin',
      isActive: false,
      fullName: 'E2E Admin',
      state: 'deactivated',
    })

    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('denies fake e2e auth sessions when the role is below minimum', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue({
      userId: 'fake-user',
      email: 'viewer@everlume.local',
      role: 'viewer',
      isActive: true,
      fullName: 'Viewer User',
      state: 'active',
    })

    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    const auth = await requireAdminUser({ minRole: 'admin' })

    expect(auth.ok).toBe(false)
    if (!auth.ok) expect(auth.response.status).toBe(403)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('falls back to Supabase auth when fake auth is enabled but no session exists', async () => {
    process.env.E2E_FAKE_AUTH = '1'
    const e2eAuth = await import('@/lib/server/e2e-auth')
    vi.spyOn(e2eAuth, 'getE2EAuthSession').mockResolvedValue(null)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })

    const { requireAdminUser } = await import('@/lib/server/admin-auth')
    const auth = await requireAdminUser({ minRole: 'viewer' })

    expect(auth.ok).toBe(true)
    expect(mockGetUser).toHaveBeenCalled()
  })
})

describe('admin-auth ownership helpers', () => {
  beforeEach(() => {
    mockPageSingle.mockReset()
    mockPageEq.mockClear()
    mockPageOwnerEq.mockClear()
    mockPageSelect.mockClear()
    mockRowSingle.mockReset()
    mockRowEq.mockClear()
    mockRowSelect.mockClear()
  })

  it('scopes memorial ownership checks to owner_id for non-admin roles', async () => {
    const { assertMemorialOwnership } = await import('@/lib/server/admin-auth')
    mockPageSingle.mockResolvedValue({ data: { id: 'memorial-1' } })

    const owned = await assertMemorialOwnership(
      { from: () => ({ select: mockPageSelect }) } as never,
      'memorial-1',
      'user-1',
      'viewer'
    )

    expect(owned).toBe(true)
    expect(mockPageEq).toHaveBeenCalledWith('id', 'memorial-1')
    expect(mockPageOwnerEq).toHaveBeenCalledWith('owner_id', 'user-1')
  })

  it('skips owner scoping for admin memorial ownership checks', async () => {
    const { assertMemorialOwnership } = await import('@/lib/server/admin-auth')
    mockPageSingle.mockResolvedValue({ data: { id: 'memorial-1' } })

    const owned = await assertMemorialOwnership(
      { from: () => ({ select: mockPageSelect }) } as never,
      'memorial-1',
      'admin-1',
      'admin'
    )

    expect(owned).toBe(true)
    expect(mockPageEq).toHaveBeenCalledWith('id', 'memorial-1')
    expect(mockPageOwnerEq).not.toHaveBeenCalled()
  })

  it('returns null when getOwnedMemorial cannot find a record', async () => {
    const { getOwnedMemorial } = await import('@/lib/server/admin-auth')
    mockPageSingle.mockResolvedValue({ data: null })

    const memorial = await getOwnedMemorial(
      { from: () => ({ select: mockPageSelect }) } as never,
      'memorial-1',
      'user-1',
      'viewer'
    )

    expect(memorial).toBeNull()
    expect(mockPageOwnerEq).toHaveBeenCalledWith('owner_id', 'user-1')
  })

  it('skips owner scoping when getOwnedMemorial is called as admin', async () => {
    const { getOwnedMemorial } = await import('@/lib/server/admin-auth')
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'memorial-1',
        title: 'Memorial One',
        slug: 'memorial-one',
        full_name: 'Memorial One',
        dedication_text: null,
        dob: null,
        dod: null,
        privacy: 'public',
        access_mode: 'public',
        hero_image_url: null,
        memorial_theme: null,
        memorial_slideshow_enabled: null,
        memorial_slideshow_interval_ms: null,
        memorial_video_layout: null,
        memorial_photo_fit: null,
        memorial_caption_style: null,
        qr_template: null,
        qr_caption: null,
        qr_foreground_color: null,
        qr_background_color: null,
        qr_frame_style: null,
        qr_caption_font: null,
        qr_show_logo: null,
      },
    })

    const memorial = await getOwnedMemorial(
      { from: () => ({ select: mockPageSelect }) } as never,
      'memorial-1',
      'admin-1',
      'admin'
    )

    expect(memorial).toMatchObject({ id: 'memorial-1', slug: 'memorial-one' })
    expect(mockPageOwnerEq).not.toHaveBeenCalled()
  })

  it('returns false when an owned-row lookup misses and checks page ownership when found', async () => {
    const { assertOwnedRowByMemorialId } =
      await import('@/lib/server/admin-auth')
    mockRowSingle.mockResolvedValueOnce({ data: null })
    mockRowSingle.mockResolvedValueOnce({
      data: { id: 'entry-1', page_id: 'memorial-1' },
    })
    mockPageSingle.mockResolvedValue({ data: { id: 'memorial-1' } })

    const missing = await assertOwnedRowByMemorialId(
      {
        from: (table: string) =>
          table === 'guestbook'
            ? { select: mockRowSelect }
            : { select: mockPageSelect },
      } as never,
      'guestbook',
      'entry-missing',
      'user-1',
      'viewer'
    )
    const owned = await assertOwnedRowByMemorialId(
      {
        from: (table: string) =>
          table === 'guestbook'
            ? { select: mockRowSelect }
            : { select: mockPageSelect },
      } as never,
      'guestbook',
      'entry-1',
      'user-1',
      'viewer'
    )

    expect(missing).toBe(false)
    expect(owned).toBe(true)
    expect(mockRowEq).toHaveBeenCalledWith('id', 'entry-1')
    expect(mockPageEq).toHaveBeenCalledWith('id', 'memorial-1')
  })
})
