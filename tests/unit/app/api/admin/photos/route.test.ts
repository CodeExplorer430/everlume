import { POST } from '@/app/api/admin/photos/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockPhotoSingle = vi.fn()
const mockPhotoSelect = vi.fn(() => ({ single: mockPhotoSingle }))
const mockPhotoInsert = vi.fn(() => ({ select: mockPhotoSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      return { insert: mockPhotoInsert }
    },
  }),
}))

describe('POST /api/admin/photos', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPhotoInsert.mockClear()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns validation error for invalid payload', async () => {
    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId: 'invalid' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('creates photo metadata for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', image_url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg' },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Sunset',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
        thumbUrl: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_400/abc.jpg',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockPhotoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Sunset',
        cloudinary_public_id: 'everlume/abc',
      })
    )
  })
})
