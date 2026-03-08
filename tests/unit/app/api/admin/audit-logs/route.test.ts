import { GET } from '@/app/api/admin/audit-logs/route'

const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockRequireAdminUser = vi.fn()

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: () => mockRequireAdminUser(),
  databaseError: (message: string) => Response.json({ code: 'DATABASE_ERROR', message }, { status: 500 }),
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

  it('returns latest audit logs', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: { from: mockFrom },
    })
    mockLimit.mockResolvedValue({
      data: [{ id: 'log-1', action: 'page.create', entity: 'page' }],
      error: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.logs).toHaveLength(1)
    expect(payload.logs[0]).toMatchObject({ action: 'memorial.create', entity: 'memorial' })
  })
})
