import { GET, PATCH } from '@/app/api/admin/site-settings/route'

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockLogAdminAudit = vi.fn()

const mockRequireAdminUser = vi.fn()

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  databaseError: (message: string) => new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), { status: 500 }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('/api/admin/site-settings', () => {
  beforeEach(() => {
    mockSingle.mockReset()
    mockUpdate.mockReset()
    mockUpdateEq.mockReset()
    mockRequireAdminUser.mockReset()
    mockLogAdminAudit.mockReset()
  })

  it('returns settings for authorized viewer', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: true,
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body: 'Protected media consent copy for the family memorial.',
        protected_media_consent_version: 2,
      },
      error: null,
    })
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
    await expect(res.json()).resolves.toMatchObject({
      settings: expect.objectContaining({
        protectedMediaConsentTitle: 'Media Viewing Notice',
        protectedMediaConsentVersion: 2,
      }),
    })
  })

  it('updates settings for authorized admin', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body: 'Original protected media consent copy for the memorial.',
        protected_media_consent_version: 1,
      },
      error: null,
    })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      supabase: {
        from: () => ({
          select: mockSelect,
          update: mockUpdate,
        }),
      },
    })

    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        homeDirectoryEnabled: true,
        protectedMediaConsentTitle: 'Updated Notice',
        protectedMediaConsentBody: 'Updated protected media consent copy for the memorial family viewers.',
      }),
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'site_settings.update',
        entity: 'site_settings',
        metadata: expect.objectContaining({
          before: expect.objectContaining({ homeDirectoryEnabled: false }),
          after: expect.objectContaining({
            homeDirectoryEnabled: true,
            protectedMediaConsentTitle: 'Updated Notice',
            protectedMediaConsentVersion: 2,
          }),
        }),
      })
    )
  })

  it('returns 400 for invalid JSON payload', async () => {
    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ homeDirectoryEnabled: 'yes' }),
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns auth response when admin check fails', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) })

    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ homeDirectoryEnabled: true }),
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(403)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when current settings lookup fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'read failed' } })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      supabase: {
        from: () => ({
          select: mockSelect,
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
    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when update fails and does not audit', async () => {
    mockSingle.mockResolvedValue({ data: { home_directory_enabled: false }, error: null })
    mockUpdateEq.mockResolvedValue({ error: { message: 'write failed' } })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      supabase: {
        from: () => ({
          select: mockSelect,
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
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
