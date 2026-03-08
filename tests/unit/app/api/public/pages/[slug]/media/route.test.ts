import { GET } from '@/app/api/public/pages/[slug]/media/route'

const mockCanAccessMemorial = vi.fn()
const mockCreateSignedMediaToken = vi.fn((...args: unknown[]) => `${args[0] as string}-${args[1] as string}-token`)
const mockPageSingle = vi.fn()
const mockPageEq = vi.fn(() => ({ single: mockPageSingle }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEq }))
const mockPhotosOrder = vi.fn()
const mockPhotosEq = vi.fn(() => ({ order: mockPhotosOrder }))
const mockPhotosSelect = vi.fn(() => ({ eq: mockPhotosEq }))

vi.mock('@/lib/server/page-access', () => ({
  canAccessMemorial: (...args: unknown[]) => mockCanAccessMemorial(...args),
  memorialRequiresProtectedMedia: (page: { access_mode?: 'public' | 'private' | 'password' | null; privacy?: 'public' | 'private' | null }) =>
    (page.access_mode || (page.privacy === 'private' ? 'private' : 'public')) !== 'public',
}))

vi.mock('@/lib/server/private-media', () => ({
  createSignedMediaToken: (...args: unknown[]) => mockCreateSignedMediaToken(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'pages') return { select: mockPageSelect }
      return { select: mockPhotosSelect }
    },
  }),
}))

describe('GET /api/public/pages/[slug]/media', () => {
  beforeEach(() => {
    mockCanAccessMemorial.mockReset()
    mockCreateSignedMediaToken.mockClear()
    mockPageSingle.mockReset()
    mockPhotosOrder.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns plain media urls for public pages', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'public', access_mode: 'public', password_updated_at: null } })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockPhotosOrder.mockResolvedValue({
      data: [
        { id: 'photo-1', caption: 'c1', image_url: 'https://img/1.jpg', thumb_url: 'https://img/1-thumb.jpg' },
      ],
      error: null,
    })

    const req = new Request('http://localhost/api/public/pages/legacy/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'legacy' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.photos[0].image_url).toBe('https://img/1.jpg')
    expect(mockCreateSignedMediaToken).not.toHaveBeenCalled()
  })

  it('returns tokenized media urls for password memorials after unlock', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'password', password_updated_at: '2026-03-01T00:00:00.000Z' } })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockPhotosOrder.mockResolvedValue({
      data: [
        { id: 'photo-1', caption: 'c1', image_url: 'https://img/1.jpg', thumb_url: 'https://img/1-thumb.jpg' },
      ],
      error: null,
    })

    const req = new Request('http://localhost/api/public/pages/private/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'private' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.photos[0].image_url).toContain('/api/public/media/photo-1?variant=image&token=')
    expect(mockCreateSignedMediaToken).toHaveBeenCalledTimes(2)
  })

  it('returns 403 when a password memorial has not been unlocked', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'password', password_updated_at: null } })
    mockCanAccessMemorial.mockResolvedValue({ allowed: false, requiresPassword: true })

    const req = new Request('http://localhost/api/public/pages/protected/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'protected' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
      message: 'This memorial must be unlocked before media can be viewed.',
    })
  })

  it('returns 403 when a private memorial is not accessible', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', access_mode: 'private', password_updated_at: null } })
    mockCanAccessMemorial.mockResolvedValue({ allowed: false, requiresPassword: false })

    const req = new Request('http://localhost/api/public/pages/private/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'private' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
      message: 'This memorial is private.',
    })
  })

  it('falls back to legacy privacy when access_mode is missing', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'private', password_updated_at: null } })
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockPhotosOrder.mockResolvedValue({
      data: [
        { id: 'photo-1', caption: 'c1', image_url: 'https://img/1.jpg', thumb_url: 'https://img/1-thumb.jpg' },
      ],
      error: null,
    })

    const req = new Request('http://localhost/api/public/pages/legacy-private/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'legacy-private' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.photos[0].image_url).toContain('/api/public/media/photo-1?variant=image&token=')
  })

  it('returns fixture-backed media without hitting the database when the e2e public lane is enabled', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockCanAccessMemorial.mockResolvedValue({ allowed: true, requiresPassword: false })

    const req = new Request('http://localhost/api/public/pages/e2e-public-memorial/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'e2e-public-memorial' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.photos).toHaveLength(2)
    expect(json.photos[0].image_url).toBe('/vercel.svg')
    expect(mockPageSingle).not.toHaveBeenCalled()
    expect(mockPhotosOrder).not.toHaveBeenCalled()
  })

  it('returns fixture password memorial denial before media is unlocked', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockCanAccessMemorial.mockResolvedValue({ allowed: false, requiresPassword: true })

    const req = new Request('http://localhost/api/public/pages/e2e-password-memorial/media')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'e2e-password-memorial' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
      message: 'This memorial must be unlocked before media can be viewed.',
    })
    expect(mockPageSingle).not.toHaveBeenCalled()
  })
})
