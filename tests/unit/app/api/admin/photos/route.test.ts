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
const mockLogAdminAudit = vi.fn()

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

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/photos', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPhotoInsert.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns validation errors for invalid json and invalid payloads', async () => {
    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/photos',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )

    const invalidJsonResponse = await POST(invalidJsonRequest as never)
    expect(invalidJsonResponse.status).toBe(400)

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memorialId: 'invalid' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('rejects cross-origin photo metadata writes before auth', async () => {
    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(403)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockPhotoInsert).not.toHaveBeenCalled()
  })

  it('creates photo metadata for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        caption: 'Sunset',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
        thumbUrl:
          'https://res.cloudinary.com/demo/image/upload/c_fill,w_400/abc.jpg',
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
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'photo.create',
        entity: 'photo',
        entityId: 'photo-1',
      })
    )
  })

  it('accepts pageId as the memorial identifier alias', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPhotoSingle.mockResolvedValue({
      data: {
        id: 'photo-1',
        image_url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockPhotoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns forbidden when the editor does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
    expect(mockPhotoInsert).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a database error when photo metadata cannot be saved', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPhotoSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })

    const req = new Request('http://localhost/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        cloudinaryPublicId: 'everlume/abc',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
