import { DELETE, PATCH } from '@/app/api/admin/redirects/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockRedirectSingle = vi.fn()
const mockRedirectEqCreatedBy = vi.fn(() => ({ single: mockRedirectSingle }))
const mockRedirectEqId = vi.fn(() => ({ eq: mockRedirectEqCreatedBy }))
const mockRedirectSelect = vi.fn(() => ({ eq: mockRedirectEqId }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return {
        select: mockRedirectSelect,
        delete: mockDelete,
        update: mockUpdate,
      }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('/api/admin/redirects/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockRedirectSingle.mockReset()
    mockRedirectEqId.mockClear()
    mockRedirectEqCreatedBy.mockClear()
    mockDeleteEq.mockReset()
    mockUpdate.mockClear()
    mockUpdateEq.mockClear()
    mockUpdateSelect.mockClear()
    mockUpdateSingle.mockReset()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid delete params', async () => {
    const req = new Request('http://localhost/api/admin/redirects/not-a-uuid', {
      method: 'DELETE',
    })
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns auth response for delete when admin auth fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockRedirectEqId).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns forbidden for non-owner on delete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(403)
  })

  it('deletes redirect for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(200)
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'redirect.delete',
        entity: 'redirect',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('deletes redirect for admins without applying created_by ownership scope', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockRedirectEqId.mockImplementationOnce(() => ({
      eq: mockRedirectEqCreatedBy,
      single: mockRedirectSingle,
    }))
    mockRedirectSingle.mockResolvedValue({
      data: { id: 'r1', created_by: 'user-2' },
    })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockRedirectEqCreatedBy).not.toHaveBeenCalledWith(
      'created_by',
      'admin-1'
    )
  })

  it('returns 500 when redirect deletion fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      { method: 'DELETE' }
    )
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid patch params and invalid json payloads', async () => {
    const invalidIdRequest = new Request(
      'http://localhost/api/admin/redirects/not-a-uuid',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'verified' }),
      }
    )
    const invalidIdResponse = await PATCH(invalidIdRequest as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(invalidIdResponse.status).toBe(400)

    const invalidJsonRequest = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
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
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns auth response for patch when admin auth fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'verified' }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockRedirectEqId).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('rejects patch when no mutable fields are provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(400)
  })

  it('updates redirect print status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'verified',
        last_verified_at: '2026-03-06T00:00:00.000Z',
        is_active: true,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'verified' }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ print_status: 'verified' })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'redirect.update',
        entity: 'redirect',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
        metadata: expect.objectContaining({
          printStatus: 'verified',
          isActive: true,
        }),
      })
    )
  })

  it('scopes patch ownership by created_by for non-admin owners', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({
      data: { id: 'r1', created_by: 'user-1' },
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'verified',
        last_verified_at: '2026-03-06T00:00:00.000Z',
        is_active: false,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockRedirectEqCreatedBy).toHaveBeenCalledWith('created_by', 'user-1')
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'redirect.update',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      })
    )
  })

  it('updates redirects for admins without applying owner scope during patch', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'admin', is_active: true },
      error: null,
    })
    mockRedirectEqId.mockImplementationOnce(() => ({
      eq: mockRedirectEqCreatedBy,
      single: mockRedirectSingle,
    }))
    mockRedirectSingle.mockResolvedValue({
      data: { id: 'r1', created_by: 'user-2' },
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'verified',
        last_verified_at: '2026-03-06T00:00:00.000Z',
        is_active: true,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'verified' }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockRedirectEqCreatedBy).not.toHaveBeenCalledWith(
      'created_by',
      'admin-1'
    )
  })

  it('returns forbidden for patch when the owner-scoped redirect lookup returns null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockRedirectEqCreatedBy).toHaveBeenCalledWith('created_by', 'user-1')
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('clears last verified timestamp when print status is marked unverified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'unverified' }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        print_status: 'unverified',
        last_verified_at: null,
      })
    )
  })

  it('updates only active state when requested', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/grandma',
        print_status: 'verified',
        last_verified_at: '2026-03-06T00:00:00.000Z',
        is_active: false,
        created_at: '2026-03-06T00:00:00.000Z',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    )
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ print_status: expect.anything() })
    )
  })

  it('returns 500 when redirect update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRedirectSingle.mockResolvedValue({ data: { id: 'r1' } })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const req = new Request(
      'http://localhost/api/admin/redirects/550e8400-e29b-41d4-a716-446655440000',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ printStatus: 'verified' }),
      }
    )
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
