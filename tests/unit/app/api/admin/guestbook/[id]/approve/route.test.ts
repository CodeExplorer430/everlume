import { POST } from '@/app/api/admin/guestbook/[id]/approve/route'

const mockRequireAdminUser = vi.fn()
const mockAssertOwnedRowByPageId = vi.fn()
const mockForbidden = vi.fn(
  (message: string) =>
    new Response(JSON.stringify({ code: 'FORBIDDEN', message }), {
      status: 403,
    })
)
const mockLogAdminAudit = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  assertOwnedRowByPageId: (...args: unknown[]) =>
    mockAssertOwnedRowByPageId(...args),
  forbidden: (message: string) => mockForbidden(message),
  databaseError: (message: string) =>
    new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), {
      status: 500,
    }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/guestbook/[id]/approve', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockAssertOwnedRowByPageId.mockReset()
    mockForbidden.mockClear()
    mockLogAdminAudit.mockReset()
    mockUpdate.mockClear()
    mockUpdateEq.mockReset()
  })

  it('returns validation error for invalid id', async () => {
    const req = new Request(
      'http://localhost/api/admin/guestbook/not-a-uuid/approve',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
  })

  it('approves guestbook entry for authorized owner', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: () => ({
          update: mockUpdate,
        }),
      },
    })
    mockAssertOwnedRowByPageId.mockResolvedValue(true)
    mockUpdateEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/guestbook/550e8400-e29b-41d4-a716-446655440000/approve',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true })
    expect(mockUpdateEq).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockLogAdminAudit).toHaveBeenCalled()
  })

  it('returns auth response without mutating when user is unauthorized', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in.',
        }),
        { status: 401 }
      ),
    })

    const req = new Request(
      'http://localhost/api/admin/guestbook/550e8400-e29b-41d4-a716-446655440000/approve',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockAssertOwnedRowByPageId).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns forbidden when owner check fails', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: () => ({
          update: mockUpdate,
        }),
      },
    })
    mockAssertOwnedRowByPageId.mockResolvedValue(false)

    const req = new Request(
      'http://localhost/api/admin/guestbook/550e8400-e29b-41d4-a716-446655440000/approve',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockForbidden).toHaveBeenCalledWith(
      'You do not have access to this entry.'
    )
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns database error without auditing when approve fails', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: () => ({
          update: mockUpdate,
        }),
      },
    })
    mockAssertOwnedRowByPageId.mockResolvedValue(true)
    mockUpdateEq.mockResolvedValue({ error: { message: 'boom' } })

    const req = new Request(
      'http://localhost/api/admin/guestbook/550e8400-e29b-41d4-a716-446655440000/approve',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockUpdateEq).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
