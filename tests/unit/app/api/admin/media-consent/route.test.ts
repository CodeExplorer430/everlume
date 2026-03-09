import { GET } from '@/app/api/admin/media-consent/route'

const mockRequireAdminUser = vi.fn()
const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ order: mockOrder, eq: mockEq }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

describe('GET /api/admin/media-consent', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockSelect.mockReset()
    mockOrder.mockReset()
    mockEq.mockReset()
    mockLimit.mockReset()
  })

  it('returns a summarized global report for admins', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'log-1',
          page_id: 'memorial-1',
          event_type: 'consent_granted',
          access_mode: 'password',
          consent_source: 'protected_media_gate',
          consent_version: 3,
          media_kind: null,
          media_variant: null,
          ip_hash: 'ip-hash',
          user_agent_hash: 'ua-hash',
          created_at: '2026-03-09T00:00:00.000Z',
          pages: { title: 'Memorial One', slug: 'memorial-one', owner_id: 'owner-1' },
        },
      ],
      error: null,
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      role: 'admin',
      supabase: {
        from: () => ({
          select: mockSelect,
        }),
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      logs: [
        expect.objectContaining({
          memorialTitle: 'Memorial One',
          eventType: 'consent_granted',
          consentVersion: 3,
        }),
      ],
      summary: {
        total: 1,
        consentGranted: 1,
        mediaAccessed: 0,
        memorials: 1,
      },
    })
    expect(mockEq).not.toHaveBeenCalled()
  })

  it('normalizes joined memorial rows when the pages relation is returned as an array', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'log-2',
          page_id: 'memorial-2',
          event_type: 'media_accessed',
          access_mode: 'password',
          consent_source: 'protected_media_gate',
          consent_version: 1,
          media_kind: 'gallery_image',
          media_variant: 'image',
          ip_hash: 'ip-hash',
          user_agent_hash: 'ua-hash',
          created_at: '2026-03-09T01:00:00.000Z',
          pages: [{ title: 'Memorial Two', slug: 'memorial-two', owner_id: 'owner-2' }],
        },
      ],
      error: null,
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      role: 'admin',
      supabase: {
        from: () => ({
          select: mockSelect,
        }),
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      logs: [expect.objectContaining({ memorialTitle: 'Memorial Two', memorialSlug: 'memorial-two' })],
    })
  })

  it('filters the report to owned memorials for non-admin roles', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'viewer-1',
      role: 'viewer',
      supabase: {
        from: () => ({
          select: mockSelect,
        }),
      },
    })

    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('pages.owner_id', 'viewer-1')
  })

  it('returns the auth failure response when admin access is denied', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) })

    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns a database error when the consent report query fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'read failed' } })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      role: 'admin',
      supabase: {
        from: () => ({
          select: mockSelect,
        }),
      },
    })

    const res = await GET()
    expect(res.status).toBe(500)
  })
})
