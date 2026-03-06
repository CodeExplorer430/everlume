import { NextRequest } from 'next/server'
import { GET } from '@/app/api/public/media/[photoId]/route'

const mockVerifyToken = vi.fn()
const mockCanAccessPrivatePage = vi.fn()
const mockPhotoSingle = vi.fn()
const mockPhotoEq = vi.fn(() => ({ single: mockPhotoSingle }))
const mockPhotoSelect = vi.fn(() => ({ eq: mockPhotoEq }))

vi.mock('@/lib/server/private-media', () => ({
  verifySignedMediaToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

vi.mock('@/lib/server/page-access', () => ({
  canAccessPrivatePage: (...args: unknown[]) => mockCanAccessPrivatePage(...args),
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
    mockCanAccessPrivatePage.mockReset()
    mockPhotoSingle.mockReset()
  })

  it('returns 403 for invalid token', async () => {
    mockVerifyToken.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=bad')
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
        pages: { owner_id: 'owner-1', privacy: 'private' },
      },
    })
    mockCanAccessPrivatePage.mockResolvedValue({ allowed: false, userId: 'user-1' })

    const req = new NextRequest('http://localhost/api/public/media/photo-1?token=valid')
    const res = await GET(req, { params: Promise.resolve({ photoId: 'photo-1' }) })

    expect(res.status).toBe(403)
  })
})
