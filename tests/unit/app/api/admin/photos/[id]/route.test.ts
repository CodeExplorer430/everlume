import { DELETE, PATCH } from '@/app/api/admin/photos/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))

const mockPhotoSingle = vi.fn()
const mockPhotoEq = vi.fn(() => ({ single: mockPhotoSingle }))
const mockPhotoSelect = vi.fn(() => ({ eq: mockPhotoEq }))

const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'pages') return { select: mockPageSelect }
      if (table === 'photos') {
        return {
          select: mockPhotoSelect,
          update: mockUpdate,
          delete: mockDelete,
        }
      }
      return {}
    },
  }),
}))

describe('PATCH /api/admin/photos/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPageSingle.mockReset()
    mockUpdateEq.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caption: 'Updated caption' }),
    })

    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(401)
  })

  it('updates caption for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({ data: { id: 'photo-1', page_id: 'page-1' } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateEq.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caption: 'Updated caption' }),
    })

    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ caption: 'Updated caption' }))
  })
})

describe('DELETE /api/admin/photos/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPageSingle.mockReset()
    mockDeleteEq.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
  })

  it('deletes photo for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({ data: { id: 'photo-1', page_id: 'page-1' } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000', {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalled()
  })
})
