import { NextRequest } from 'next/server'
import { GET } from '@/app/api/public/media/[photoId]/route'

const mockVerifyToken = vi.fn()
const mockCanAccessMemorial = vi.fn()
const mockVerifyConsent = vi.fn()
const mockTryInsertMediaAccess = vi.fn()
const mockPhotoSingle = vi.fn()
const mockPhotoEq = vi.fn(() => ({ single: mockPhotoSingle }))
const mockPhotoSelect = vi.fn(() => ({ eq: mockPhotoEq }))
const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/server/private-media', () => ({
  verifySignedMediaToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

vi.mock('@/lib/server/media-consent', () => ({
  getMemorialMediaConsentCookieName: (memorialId: string) => `everlume_memorial_media_consent_${memorialId}`,
  verifyMemorialMediaConsentToken: (...args: unknown[]) => mockVerifyConsent(...args),
  tryInsertMemorialMediaAccess: (...args: unknown[]) => mockTryInsertMediaAccess(...args),
}))

vi.mock('@/lib/server/page-access', () => ({
  canAccessMemorial: (...args: unknown[]) => mockCanAccessMemorial(...args),
  memorialRequiresProtectedMedia: (page: { access_mode?: 'public' | 'private' | 'password' | null; privacy?: 'public' | 'private' | null }) =>
    (page.access_mode || (page.privacy === 'private' ? 'private' : 'public')) !== 'public',
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: mockPhotoSelect,
    }),
  }),
}))

describe('GET /api/public/media/[photoId]', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset()
    mockCanAccessMemorial.mockReset()
    mockVerifyConsent.mockReset()
    mockTryInsertMediaAccess.mockReset()
    mockPhotoSingle.mockReset()
    fetchMock.mockReset()
    mockVerifyConsent.mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 403 for invalid token', async () => {
    mockVerifyToken.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=bad')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(403)
  })

  it('returns 404 when the photo cannot be found', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({ data: null })

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(404)
  })

  it('returns 403 when the photo is not attached to a private page', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'public', access_mode: 'public', password_updated_at: null },
      },
    })

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(403)
  })

  it('returns 403 when private page access is denied', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'private', password_updated_at: null },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: false, requiresPassword: false })

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(403)
  })

  it('returns 404 when the requested media url is missing', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: null,
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'private', password_updated_at: null },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(404)
  })

  it('returns 403 when protected media consent is missing', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'password', password_updated_at: '2026-03-01T00:00:00.000Z' },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockVerifyConsent.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: 'CONSENT_REQUIRED',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 502 when the upstream image fetch fails', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'private', password_updated_at: null },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    fetchMock.mockResolvedValue(new Response(null, { status: 502 }))

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(502)
  })

  it('streams the requested image variant when access is valid', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: 'https://example.com/photo-thumb.jpg',
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'private', password_updated_at: null },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    fetchMock.mockResolvedValue(
      new Response('thumb-bytes', {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      })
    )

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid&variant=thumb')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/photo-thumb.jpg', { cache: 'no-store' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(mockTryInsertMediaAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        memorialId: 'page-1',
        photoId: 'photo-1',
        eventType: 'media_accessed',
        mediaKind: 'gallery_thumb',
      })
    )
  })

  it('allows password-protected memorial media after unlock access is granted', async () => {
    mockVerifyToken.mockReturnValue(true)
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://example.com/photo.jpg',
        thumb_url: null,
        pages: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'password', password_updated_at: '2026-03-01T00:00:00.000Z' },
      },
    })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    fetchMock.mockResolvedValue(
      new Response('image-bytes', {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    )

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/photo.jpg', { cache: 'no-store' })
  })

  it('redirects to fixture-backed protected media when the e2e public lane is enabled', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockVerifyToken.mockReturnValue(true)
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new NextRequest('http://localhost/api/public/media/22222222-2222-2222-2222-222222222221?token=valid&variant=thumb')
    const res = await GET(req, { params: Promise.resolve({ photoId: '22222222-2222-2222-2222-222222222221' }) })

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/file.svg')
    expect(mockPhotoSingle).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
