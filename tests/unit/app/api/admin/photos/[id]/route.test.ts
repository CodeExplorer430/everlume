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
const mockLogAdminAudit = vi.fn()

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

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('PATCH /api/admin/photos/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPageSingle.mockReset()
    mockUpdate.mockReset()
    mockUpdateEq.mockReset()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid params, invalid json, and invalid payloads', async () => {
    const invalidIdRequest = new Request(
      'http://localhost/api/admin/photos/not-a-uuid',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated caption' }),
      }
    )

    const invalidIdResponse = await PATCH(invalidIdRequest as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(invalidIdResponse.status).toBe(400)

    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    )

    const invalidJsonResponse = await PATCH(invalidJsonRequest as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(invalidJsonResponse.status).toBe(400)

    const invalidPayloadRequest = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'x'.repeat(241) }),
      }
    )

    const invalidPayloadResponse = await PATCH(invalidPayloadRequest as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(invalidPayloadResponse.status).toBe(400)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated caption' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(401)
  })

  it('updates caption for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated caption' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ caption: 'Updated caption' })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'photo.update',
        entity: 'photo',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns forbidden when the photo is not owned by the editor', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated caption' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when the photo update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateEq.mockResolvedValue({ error: { message: 'write failed' } })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated caption' }),
      }
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/admin/photos/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPhotoSingle.mockReset()
    mockPageSingle.mockReset()
    mockDelete.mockReset()
    mockDeleteEq.mockReset()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid delete params', async () => {
    const req = new Request('http://localhost/api/admin/photos/not-a-uuid', {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns unauthorized without user for delete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('deletes photo for authorized owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalled()
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'photo.delete',
        entity: 'photo',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('returns forbidden for delete when the photo is not owned by the editor', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when the photo delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPhotoSingle.mockResolvedValue({
      data: { id: 'photo-1', page_id: 'page-1' },
    })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const req = new Request(
      'http://localhost/api/admin/photos/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'DELETE',
      }
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
