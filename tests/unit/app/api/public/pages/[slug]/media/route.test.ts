import { GET } from '@/app/api/public/pages/[slug]/media/route'

const mockCanAccessPrivatePage = vi.fn()
const mockCreateSignedMediaToken = vi.fn((...args: unknown[]) => `${args[0] as string}-${args[1] as string}-token`)
const mockPageSingle = vi.fn()
const mockPageEq = vi.fn(() => ({ single: mockPageSingle }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEq }))
const mockPhotosOrder = vi.fn()
const mockPhotosEq = vi.fn(() => ({ order: mockPhotosOrder }))
const mockPhotosSelect = vi.fn(() => ({ eq: mockPhotosEq }))

vi.mock('@/lib/server/page-access', () => ({
  canAccessPrivatePage: (...args: unknown[]) => mockCanAccessPrivatePage(...args),
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
    mockCanAccessPrivatePage.mockReset()
    mockCreateSignedMediaToken.mockClear()
    mockPageSingle.mockReset()
    mockPhotosOrder.mockReset()
  })

  it('returns plain media urls for public pages', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'public' } })
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

  it('returns tokenized media urls for private pages with access', async () => {
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1', owner_id: 'owner-1', privacy: 'private' } })
    mockCanAccessPrivatePage.mockResolvedValue({ allowed: true, userId: 'user-1' })
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
})
