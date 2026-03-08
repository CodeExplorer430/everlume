import { canAccessMemorial, canAccessPrivatePage, memorialRequiresProtectedMedia, resolveMemorialAccessMode } from '@/lib/server/page-access'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))

const mockCookieGet = vi.fn()
const mockCookies = vi.fn(() => ({ get: mockCookieGet }))
const mockVerifyPageAccessToken = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return { select: vi.fn() }
    },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

vi.mock('@/lib/server/page-password', () => ({
  getMemorialAccessCookieName: (pageId: string) => `page_access_${pageId}`,
  verifyMemorialAccessToken: (...args: unknown[]) => mockVerifyPageAccessToken(...args),
}))

describe('canAccessPrivatePage', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
  })

  it('denies access when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: false, userId: null })
  })

  it('allows owner access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: true, userId: 'owner-1' })
  })

  it('denies inactive profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: false } })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: false, userId: 'user-1' })
  })

  it('denies access when the profile record is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: null })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: false, userId: 'user-1' })
  })

  it('allows active admin/editor/viewer profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'viewer', is_active: true } })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: true, userId: 'user-1' })
  })

  it('denies access when the authenticated user has an unsupported role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'guest', is_active: true } })

    const result = await canAccessPrivatePage('owner-1')
    expect(result).toEqual({ allowed: false, userId: 'user-1' })
  })
})

describe('canAccessMemorial', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockCookies.mockClear()
    mockCookieGet.mockReset()
    mockVerifyPageAccessToken.mockReset()
  })

  it('allows public memorials without auth checks', async () => {
    const result = await canAccessMemorial({ id: 'page-1', owner_id: 'owner-1', access_mode: 'public' })
    expect(result).toEqual({ allowed: true, requiresPassword: false })
  })

  it('treats access_mode as canonical over legacy privacy', async () => {
    expect(resolveMemorialAccessMode({ access_mode: 'public', privacy: 'private' })).toBe('public')
    expect(memorialRequiresProtectedMedia({ access_mode: 'password', privacy: 'public' })).toBe(true)
  })

  it('falls back to legacy privacy when access_mode is missing', async () => {
    expect(resolveMemorialAccessMode({ privacy: 'private' })).toBe('private')
    expect(resolveMemorialAccessMode({ privacy: 'public' })).toBe('public')
  })

  it('denies private memorials when requester has no private access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await canAccessMemorial({ id: 'page-1', owner_id: 'owner-1', access_mode: 'private' })
    expect(result).toEqual({ allowed: false, requiresPassword: false })
  })

  it('requires password and allows access when cookie token is valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCookieGet.mockReturnValue({ value: 'token-1' })
    mockVerifyPageAccessToken.mockReturnValue(true)

    const result = await canAccessMemorial({ id: 'page-1', owner_id: 'owner-1', access_mode: 'password', password_updated_at: null })
    expect(result).toEqual({ allowed: true, requiresPassword: true })
  })

  it('requires password and denies access when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCookieGet.mockReturnValue({ value: 'token-1' })
    mockVerifyPageAccessToken.mockReturnValue(false)

    const result = await canAccessMemorial({ id: 'page-1', owner_id: 'owner-1', access_mode: 'password', password_updated_at: null })
    expect(result).toEqual({ allowed: false, requiresPassword: true })
  })

  it('allows an authenticated owner/admin path for password memorials without using the unlock cookie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })

    const result = await canAccessMemorial({ id: 'page-1', owner_id: 'owner-1', access_mode: 'password', password_updated_at: null })
    expect(result).toEqual({ allowed: true, requiresPassword: true })
    expect(mockCookieGet).not.toHaveBeenCalled()
    expect(mockVerifyPageAccessToken).not.toHaveBeenCalled()
  })
})
