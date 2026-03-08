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

describe('POST /api/admin/memorials', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockInsert.mockClear()
    mockInsertSingle.mockReset()
    mockSettingsSingle.mockReset()
    mockSettingsSingle.mockResolvedValue({
      data: {
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'grid',
      },
      error: null,
    })
    mockProfileSingle.mockResolvedValue({ data: { role: 'editor', is_active: true }, error: null })
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
    mockInsertSingle.mockResolvedValue({ data: { id: 'p1', slug: 'in-memory' }, error: null })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'In Memory', slug: 'in-memory', fullName: 'Jane Doe' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'In Memory',
        slug: 'in-memory',
        owner_id: 'user-1',
      })
    )
    const payload = await res.json()
    expect(payload.memorial).toMatchObject({
      id: 'p1',
      slug: 'in-memory',
      accessMode: 'public',
    })
  })

  it('returns forbidden when role is viewer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'viewer', is_active: true }, error: null })

    const req = new Request('http://localhost/api/admin/memorials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'In Memory', slug: 'in-memory', fullName: 'Jane Doe' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })
})
