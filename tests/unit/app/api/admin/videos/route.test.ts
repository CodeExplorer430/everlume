import { POST } from '@/app/api/admin/videos/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockVideoSingle = vi.fn()
const mockVideoSelect = vi.fn(() => ({ single: mockVideoSingle }))
const mockVideoInsert = vi.fn(() => ({ select: mockVideoSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      return { insert: mockVideoInsert }
    },
  }),
}))

describe('POST /api/admin/videos', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockVideoSingle.mockReset()
    mockVideoInsert.mockClear()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns validation error for non-youtube url', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/video',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('creates youtube video for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockVideoSingle.mockResolvedValue({
      data: { id: 'v1', provider_id: 'abcdefghijk', title: 'Clip' },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
        title: 'Clip',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockVideoInsert).toHaveBeenCalledWith({
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'youtube',
      provider_id: 'abcdefghijk',
      title: 'Clip',
    })
  })
})
