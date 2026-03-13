import { GET, PATCH } from '@/app/api/admin/memorials/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockLogAdminAudit = vi.fn()
const mockHashMemorialPassword = vi.fn()

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

vi.mock('@/lib/server/page-password', () => ({
  hashMemorialPassword: (...args: unknown[]) =>
    mockHashMemorialPassword(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return {
        select: mockPageSelect,
        update: mockUpdate,
      }
    },
  }),
}))

function createPatchRequest(body: BodyInit) {
  return new Request(
    'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body,
    }
  )
}

describe('PATCH /api/admin/memorials/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockProfileEq.mockClear()
    mockPageSingle.mockReset()
    mockPageEqId.mockClear()
    mockPageEqOwner.mockClear()
    mockUpdate.mockClear()
    mockUpdateEq.mockReset()
    mockUpdateSelect.mockClear()
    mockUpdateSingle.mockReset()
    mockLogAdminAudit.mockReset()
    mockHashMemorialPassword.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
    mockHashMemorialPassword.mockReturnValue('hashed-secret')
  })

  it('returns validation error for invalid memorial id', async () => {
    const res = await PATCH(
      createPatchRequest(JSON.stringify({ title: 'X' })) as never,
      {
        params: Promise.resolve({ id: 'not-a-uuid' }),
      }
    )

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns invalid json when request body cannot be parsed', async () => {
    const res = await PATCH(createPatchRequest('{') as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'INVALID_JSON',
      message: 'Invalid request payload.',
    })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns validation error for empty payload', async () => {
    const res = await PATCH(createPatchRequest(JSON.stringify({})) as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns validation error when password mode is missing a password', async () => {
    const res = await PATCH(
      createPatchRequest(JSON.stringify({ accessMode: 'password' })) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns unauthorized when user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await PATCH(
      createPatchRequest(JSON.stringify({ title: 'Updated' })) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns forbidden when user does not own memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const res = await PATCH(
      createPatchRequest(JSON.stringify({ title: 'Updated' })) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(403)
    expect(mockPageEqId).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockPageEqOwner).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns database error when update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const res = await PATCH(
      createPatchRequest(JSON.stringify({ title: 'Updated' })) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(500)
    expect(mockUpdateEq).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('updates memorial metadata for owner without hashing when no password is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        title: 'Updated',
        slug: 'my-page',
        dedication_text: 'Forever remembered.',
        full_name: 'Jane Doe',
        access_mode: 'private',
        privacy: 'private',
      },
      error: null,
    })

    const res = await PATCH(
      createPatchRequest(
        JSON.stringify({
          title: 'Updated',
          fullName: 'Jane Doe',
          dedicationText: 'Forever remembered.',
          accessMode: 'private',
        })
      ) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(200)
    expect(mockHashMemorialPassword).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated',
        full_name: 'Jane Doe',
        dedication_text: 'Forever remembered.',
        access_mode: 'private',
        privacy: 'private',
        password_hash: undefined,
        password_updated_at: undefined,
        updated_at: expect.any(String),
      })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'user-1',
        action: 'memorial.update',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
        metadata: {
          fields: ['title', 'fullName', 'dedicationText', 'accessMode'],
        },
      })
    )

    const payload = await res.json()
    expect(payload.memorial).toMatchObject({
      id: 'page-1',
      title: 'Updated',
      full_name: 'Jane Doe',
      dedicationText: 'Forever remembered.',
      accessMode: 'private',
    })
  })

  it('updates memorial presentation, qr, and password fields for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        title: 'My Page',
        slug: 'my-page',
        access_mode: 'password',
        privacy: 'private',
      },
      error: null,
    })

    const res = await PATCH(
      createPatchRequest(
        JSON.stringify({
          accessMode: 'password',
          password: 'secret-123',
          memorialTheme: 'serene',
          memorialSlideshowEnabled: true,
          memorialSlideshowIntervalMs: 6000,
          memorialVideoLayout: 'featured',
          memorialPhotoFit: 'contain',
          memorialCaptionStyle: 'minimal',
          qrTemplate: 'warm',
          qrCaption: 'Remember me',
          qrForegroundColor: '#14532d',
          qrBackgroundColor: '#fffaf2',
          qrFrameStyle: 'double',
          qrCaptionFont: 'sans',
          qrShowLogo: true,
        })
      ) as never,
      {
        params: Promise.resolve({
          id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }
    )

    expect(res.status).toBe(200)
    expect(mockHashMemorialPassword).toHaveBeenCalledWith('secret-123')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        access_mode: 'password',
        privacy: 'private',
        password_hash: 'hashed-secret',
        password_updated_at: expect.any(String),
        memorial_theme: 'serene',
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 6000,
        memorial_video_layout: 'featured',
        memorial_photo_fit: 'contain',
        memorial_caption_style: 'minimal',
        qr_template: 'warm',
        qr_caption: 'Remember me',
        qr_foreground_color: '#14532d',
        qr_background_color: '#fffaf2',
        qr_frame_style: 'double',
        qr_caption_font: 'sans',
        qr_show_logo: true,
      })
    )
    expect(mockLogAdminAudit).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/admin/memorials/[id]', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockProfileEq.mockClear()
    mockPageSingle.mockReset()
    mockPageEqId.mockClear()
    mockPageEqOwner.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns validation error for invalid memorial id', async () => {
    const req = new Request('http://localhost/api/admin/memorials/not-a-uuid')
    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns unauthorized when user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns forbidden when user does not own memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockPageEqId).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockPageEqOwner).toHaveBeenCalledWith('owner_id', 'user-1')
  })

  it('returns forbidden when owned memorial lookup returns no row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null, error: { message: 'miss' } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns memorial details for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        title: 'My Page',
        slug: 'my-page',
        dedication_text: 'A life well lived.',
        privacy: 'public',
        access_mode: 'public',
      },
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload.memorial).toMatchObject({
      id: 'page-1',
      title: 'My Page',
      dedicationText: 'A life well lived.',
      accessMode: 'public',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
