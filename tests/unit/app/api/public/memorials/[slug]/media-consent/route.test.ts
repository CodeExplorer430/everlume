import { POST } from '@/app/api/public/memorials/[slug]/media-consent/route'

const mockCanAccessMemorial = vi.fn()
const mockInsertMemorialMediaConsent = vi.fn()
const mockPageSingle = vi.fn()
const mockSiteSettingsSingle = vi.fn()

vi.mock('@/lib/server/page-access', () => ({
  canAccessMemorial: (...args: unknown[]) => mockCanAccessMemorial(...args),
}))

vi.mock('@/lib/server/media-consent', () => ({
  createMemorialMediaConsentToken: () => 'consent-token',
  getMemorialMediaConsentCookieName: (memorialId: string) => `everlume_memorial_media_consent_${memorialId}`,
  getMemorialMediaConsentCookieMaxAge: () => 43200,
  insertMemorialMediaConsent: (...args: unknown[]) => mockInsertMemorialMediaConsent(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: table === 'site_settings' ? mockSiteSettingsSingle : mockPageSingle,
        }),
      }),
    }),
  }),
}))

describe('POST /api/public/memorials/[slug]/media-consent', () => {
  beforeEach(() => {
    mockCanAccessMemorial.mockReset()
    mockInsertMemorialMediaConsent.mockReset()
    mockPageSingle.mockReset()
    mockSiteSettingsSingle.mockReset()
    mockSiteSettingsSingle.mockResolvedValue({ data: { protected_media_consent_version: 2 } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets a consent cookie and logs the event for protected memorials', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        owner_id: 'owner-1',
        privacy: 'private',
        access_mode: 'password',
        password_updated_at: '2026-03-09T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new Request('http://localhost/api/public/memorials/jane/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })

    expect(res.status).toBe(200)
    expect(mockInsertMemorialMediaConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        memorialId: 'page-1',
        accessMode: 'password',
        consentVersion: 2,
        eventType: 'consent_granted',
      })
    )
    expect(res.headers.get('set-cookie')).toContain('everlume_memorial_media_consent_page-1=consent-token')
  })

  it('rejects an invalid memorial slug', async () => {
    const req = new Request('http://localhost/api/public/memorials/%20/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: ' ' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('rejects consent requests for public memorials', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        owner_id: 'owner-1',
        privacy: 'public',
        access_mode: 'public',
        password_updated_at: null,
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new Request('http://localhost/api/public/memorials/jane/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: 'CONSENT_NOT_REQUIRED' })
    expect(mockInsertMemorialMediaConsent).not.toHaveBeenCalled()
  })

  it('returns not found when the memorial does not exist', async () => {
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/public/memorials/missing/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'missing' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('sets a fixture consent cookie without touching the database in the e2e lane', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new Request('http://localhost/api/public/memorials/e2e-password-memorial/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'e2e-password-memorial' }) })

    expect(res.status).toBe(200)
    expect(mockPageSingle).not.toHaveBeenCalled()
    expect(mockInsertMemorialMediaConsent).not.toHaveBeenCalled()
  })

  it('rejects consent when the memorial is not yet unlocked', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        owner_id: 'owner-1',
        privacy: 'private',
        access_mode: 'password',
        password_updated_at: '2026-03-09T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: false, requiresPassword: true })

    const req = new Request('http://localhost/api/public/memorials/jane/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
    })
    expect(mockInsertMemorialMediaConsent).not.toHaveBeenCalled()
  })

  it('returns a logging error when the consent event cannot be recorded', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        owner_id: 'owner-1',
        privacy: 'private',
        access_mode: 'password',
        password_updated_at: '2026-03-09T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockInsertMemorialMediaConsent.mockRejectedValue(new Error('Unable to record media consent.'))

    const req = new Request('http://localhost/api/public/memorials/jane/media-consent', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONSENT_LOG_ERROR',
    })
  })
})
