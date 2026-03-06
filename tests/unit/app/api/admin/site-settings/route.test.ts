import { GET, PATCH } from '@/app/api/admin/site-settings/route'

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockRequireAdminUser = vi.fn()

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

describe('/api/admin/site-settings', () => {
  beforeEach(() => {
    mockSingle.mockReset()
    mockUpdateEq.mockReset()
    mockRequireAdminUser.mockReset()
  })

  it('returns settings for authorized viewer', async () => {
    mockSingle.mockResolvedValue({ data: { home_directory_enabled: true }, error: null })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: {
        from: () => ({
          select: mockSelect,
        }),
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('updates settings for authorized admin', async () => {
    mockUpdateEq.mockResolvedValue({ error: null })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      supabase: {
        from: () => ({
          update: mockUpdate,
        }),
      },
    })

    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ homeDirectoryEnabled: true }),
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })
})
