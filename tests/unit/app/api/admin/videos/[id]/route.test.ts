import { DELETE } from '@/app/api/admin/videos/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockVideoSingle = vi.fn()
const mockVideoEq = vi.fn(() => ({ single: mockVideoSingle }))
const mockVideoSelect = vi.fn(() => ({ eq: mockVideoEq }))

const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))

const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'videos') {
        return { select: mockVideoSelect, delete: mockDelete }
      }
      return { select: mockPageSelect }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('DELETE /api/admin/videos/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockVideoSingle.mockReset()
    mockPageSingle.mockReset()
    mockDeleteEq.mockReset()
    mockDelete.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid params', async () => {
    const req = new Request('http://localhost/api/admin/videos/not-a-uuid', {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns unauthorized without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/videos/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns forbidden for non-owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockVideoSingle.mockResolvedValue({ data: { id: 'v1', page_id: 'page-1' } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/videos/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns a database error when delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockVideoSingle.mockResolvedValue({ data: { id: 'v1', page_id: 'page-1' } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const req = new Request(
      'http://localhost/api/admin/videos/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('deletes video for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockVideoSingle.mockResolvedValue({ data: { id: 'v1', page_id: 'page-1' } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/videos/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'video.delete',
        entity: 'video',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })
})
