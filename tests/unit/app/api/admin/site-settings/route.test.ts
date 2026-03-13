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
  databaseError: (message: string) =>
    new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), {
      status: 500,
    }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('/api/admin/site-settings', () => {
  beforeEach(() => {
    mockSingle.mockReset()
    mockEq.mockClear()
    mockSelect.mockClear()
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
        protected_media_consent_body:
          'Protected media consent copy for the family memorial.',
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
    expect(mockEq).toHaveBeenCalledWith('id', 1)
    await expect(res.json()).resolves.toMatchObject({
      settings: expect.objectContaining({
        protectedMediaConsentTitle: 'Media Viewing Notice',
        protectedMediaConsentVersion: 2,
      }),
    })
  })

  it('preserves the featured memorial video layout when loading site settings', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: true,
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 5000,
        memorial_video_layout: 'featured',
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body:
          'Protected media consent copy for the family memorial.',
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
        memorialVideoLayout: 'featured',
      }),
    })
  })

  it('returns fallback defaults for missing site settings values', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: null,
        memorial_slideshow_enabled: null,
        memorial_slideshow_interval_ms: null,
        memorial_video_layout: null,
        protected_media_consent_title: null,
        protected_media_consent_body: null,
        protected_media_consent_version: null,
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
    await expect(res.json()).resolves.toEqual({
      settings: {
        homeDirectoryEnabled: false,
        memorialSlideshowEnabled: true,
        memorialSlideshowIntervalMs: 4500,
        memorialVideoLayout: 'grid',
        protectedMediaConsentTitle: 'Media Viewing Notice',
        protectedMediaConsentBody:
          "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
        protectedMediaConsentVersion: 1,
      },
    })
  })

  it('returns auth response when viewer check fails for get', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    })

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns 500 when site settings cannot be loaded for get', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'read failed' },
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
    expect(res.status).toBe(500)
  })

  it('updates settings for authorized admin', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body:
          'Original protected media consent copy for the memorial.',
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
        protectedMediaConsentBody:
          'Updated protected media consent copy for the memorial family viewers.',
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

  it('bumps protected media consent version without changing copy when requested', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body:
          'Original protected media consent copy for the memorial.',
        protected_media_consent_version: 3,
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
        bumpProtectedMediaConsentVersion: true,
      }),
    })

    const res = await PATCH(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        protected_media_consent_version: 4,
      })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          after: expect.objectContaining({
            protectedMediaConsentTitle: 'Media Viewing Notice',
            protectedMediaConsentVersion: 4,
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

  it('returns 400 for an empty patch payload', async () => {
    const req = new Request('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await PATCH(req as never)

    expect(res.status).toBe(400)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns auth response when admin check fails', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 403 }),
    })

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
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'read failed' },
    })
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

  it('updates non-consent settings without bumping the consent version', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'grid',
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body:
          'Original protected media consent copy for the memorial.',
        protected_media_consent_version: 3,
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
        memorialSlideshowEnabled: false,
        memorialSlideshowIntervalMs: 6000,
        memorialVideoLayout: 'featured',
      }),
    })

    const res = await PATCH(req as never)

    expect(res.status).toBe(200)
    const updateCalls = mockUpdate.mock.calls as unknown[][]
    const updatePayload = updateCalls[0]?.[0] as
      | Record<string, unknown>
      | undefined
    expect(updatePayload).toBeDefined()
    expect(updatePayload).toMatchObject({
      memorial_slideshow_enabled: false,
      memorial_slideshow_interval_ms: 6000,
      memorial_video_layout: 'featured',
      updated_at: expect.any(String),
    })
    expect(updatePayload).not.toHaveProperty('protected_media_consent_version')
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          after: expect.objectContaining({
            memorialSlideshowEnabled: false,
            memorialSlideshowIntervalMs: 6000,
            memorialVideoLayout: 'featured',
            protectedMediaConsentVersion: 3,
          }),
        }),
      })
    )
  })

  it('does not bump the consent version when bumpProtectedMediaConsentVersion is false', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        protected_media_consent_title: 'Media Viewing Notice',
        protected_media_consent_body:
          'Original protected media consent copy for the memorial.',
        protected_media_consent_version: 5,
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
        bumpProtectedMediaConsentVersion: false,
      }),
    })

    const res = await PATCH(req as never)

    expect(res.status).toBe(200)
    const updateCalls = mockUpdate.mock.calls as unknown[][]
    const updatePayload = updateCalls[0]?.[0] as
      | Record<string, unknown>
      | undefined
    expect(updatePayload).toBeDefined()
    expect(updatePayload).toMatchObject({
      home_directory_enabled: true,
      updated_at: expect.any(String),
    })
    expect(updatePayload).not.toHaveProperty('protected_media_consent_version')
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          after: expect.objectContaining({
            homeDirectoryEnabled: true,
            protectedMediaConsentVersion: 5,
          }),
        }),
      })
    )
  })

  it('uses existing fallback values in audit metadata when optional consent fields are omitted', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'featured',
        protected_media_consent_title: null,
        protected_media_consent_body: null,
        protected_media_consent_version: null,
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
      }),
    })

    const res = await PATCH(req as never)

    expect(res.status).toBe(200)
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          after: expect.objectContaining({
            homeDirectoryEnabled: true,
            memorialVideoLayout: 'featured',
            protectedMediaConsentTitle: 'Media Viewing Notice',
            protectedMediaConsentBody:
              "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
            protectedMediaConsentVersion: 1,
          }),
        }),
      })
    )
  })

  it('bumps the protected media notice version from the null fallback baseline when consent copy changes', async () => {
    mockSingle.mockResolvedValue({
      data: {
        home_directory_enabled: false,
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: null,
        memorial_video_layout: null,
        protected_media_consent_title: null,
        protected_media_consent_body: null,
        protected_media_consent_version: null,
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
        protectedMediaConsentTitle: 'Updated Notice',
        protectedMediaConsentBody:
          'Updated protected media consent copy for memorial visitors and family review.',
      }),
    })

    const res = await PATCH(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        protected_media_consent_title: 'Updated Notice',
        protected_media_consent_version: 2,
      })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          before: expect.objectContaining({
            protectedMediaConsentVersion: 1,
          }),
          after: expect.objectContaining({
            protectedMediaConsentTitle: 'Updated Notice',
            protectedMediaConsentVersion: 2,
          }),
        }),
      })
    )
  })

  it('returns 500 when update fails and does not audit', async () => {
    mockSingle.mockResolvedValue({
      data: { home_directory_enabled: false },
      error: null,
    })
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
