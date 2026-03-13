import { POST } from '@/app/api/admin/memorials/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))
const mockSettingsSingle = vi.fn()
const mockSettingsEq = vi.fn(() => ({ single: mockSettingsSingle }))
const mockSettingsSelect = vi.fn(() => ({ eq: mockSettingsEq }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'site_settings') return { select: mockSettingsSelect }
      return { insert: mockInsert }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/memorials', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockInsert.mockClear()
    mockInsertSingle.mockReset()
    mockSettingsSingle.mockReset()
    mockLogAdminAudit.mockReset()
    mockSettingsSingle.mockResolvedValue({
      data: {
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'grid',
      },
      error: null,
    })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid json payloads', async () => {
    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 400 for validation failures', async () => {
    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'A', slug: 'bad slug' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'In Memory', slug: 'in-memory' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('creates memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSingle.mockResolvedValue({
      data: { id: 'p1', slug: 'in-memory', dedication_text: 'Beloved by all.' },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'In Memory',
        slug: 'in-memory',
        fullName: 'Jane Doe',
        dedicationText: 'Beloved by all.',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'In Memory',
        slug: 'in-memory',
        dedication_text: 'Beloved by all.',
        owner_id: 'user-1',
      })
    )
    const payload = await res.json()
    expect(payload.memorial).toMatchObject({
      id: 'p1',
      slug: 'in-memory',
      dedicationText: 'Beloved by all.',
      accessMode: 'public',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'memorial.create',
        entity: 'memorial',
        entityId: 'p1',
        metadata: { slug: 'in-memory' },
      })
    )
  })

  it('falls back to default memorial presentation settings when site settings are unavailable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSettingsSingle.mockResolvedValue({
      data: null,
      error: null,
    })
    mockInsertSingle.mockResolvedValue({
      data: { id: 'p2', slug: 'legacy-memory', dedication_text: null },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Legacy Memory',
        slug: 'legacy-memory',
        fullName: '',
        dedicationText: '',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: null,
        dedication_text: null,
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'grid',
      })
    )
  })

  it('uses featured memorial video layout when site settings enable it', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSettingsSingle.mockResolvedValue({
      data: {
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 6000,
        memorial_video_layout: 'featured',
      },
      error: null,
    })
    mockInsertSingle.mockResolvedValue({
      data: { id: 'p3', slug: 'featured-memory', dedication_text: null },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Featured Memory',
        slug: 'featured-memory',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        memorial_slideshow_interval_ms: 6000,
        memorial_video_layout: 'featured',
      })
    )
  })

  it('returns 409 when the slug already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23505' },
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'In Memory', slug: 'in-memory' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(409)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 500 when memorial creation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'write failed' },
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'In Memory', slug: 'in-memory' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns forbidden when role is viewer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'viewer', is_active: true },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'In Memory',
        slug: 'in-memory',
        fullName: 'Jane Doe',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
