import { GET } from '@/app/api/admin/audit-logs/route'

const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockRequireAdminUser = vi.fn()

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: () => mockRequireAdminUser(),
  databaseError: (message: string) =>
    Response.json({ code: 'DATABASE_ERROR', message }, { status: 500 }),
}))

describe('GET /api/admin/audit-logs', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockSelect.mockClear()
    mockOrder.mockClear()
    mockLimit.mockReset()
  })

  it('returns unauthorized response from auth guard', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
    })

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns forbidden response from auth guard', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: Response.json({ code: 'FORBIDDEN' }, { status: 403 }),
    })

    const response = await GET()
    expect(response.status).toBe(403)
  })

  it('returns a database error when logs cannot be loaded', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: { from: mockFrom },
    })
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'db failed' },
    })

    const response = await GET()
    await expect(response.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to load audit logs.',
    })
    expect(response.status).toBe(500)
  })

  it('returns latest audit logs', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: { from: mockFrom },
    })
    mockLimit.mockResolvedValue({
      data: [
        { id: 'log-1', action: 'page.create', entity: 'page' },
        { id: 'log-2', action: 'user.update', entity: 'user' },
      ],
      error: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockSelect).toHaveBeenCalledWith(
      'id, actor_id, action, entity, entity_id, metadata, created_at'
    )
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(200)
    expect(payload.logs).toHaveLength(2)
    expect(payload.logs[0]).toMatchObject({
      action: 'memorial.create',
      entity: 'memorial',
    })
    expect(payload.logs[1]).toMatchObject({
      action: 'user.update',
      entity: 'user',
    })
  })

  it('returns an empty list when no audit logs exist', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: { from: mockFrom },
    })
    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    })

    const response = await GET()
    await expect(response.json()).resolves.toEqual({ logs: [] })
    expect(response.status).toBe(200)
  })

  it('treats a null audit log payload as an empty list', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: { from: mockFrom },
    })
    mockLimit.mockResolvedValue({
      data: null,
      error: null,
    })

    const response = await GET()

    await expect(response.json()).resolves.toEqual({ logs: [] })
    expect(response.status).toBe(200)
  })
})
