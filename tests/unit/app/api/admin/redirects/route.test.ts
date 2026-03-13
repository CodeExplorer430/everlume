import { POST } from '@/app/api/admin/redirects/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockInsertSelectSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSelectSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      return { insert: mockInsert }
    },
  }),
}))

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

describe('POST /api/admin/redirects', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockInsert.mockClear()
    mockInsertSelect.mockClear()
    mockInsertSelectSingle.mockReset()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for invalid json payload', async () => {
    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'ab',
        targetUrl: 'not-a-url',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns unauthorized without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('creates redirect with valid payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/x',
        print_status: 'unverified',
        last_verified_at: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith({
      shortcode: 'grandma',
      target_url: 'https://example.com/memorials/x',
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_by: 'user-1',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'user-1',
        action: 'redirect.create',
        entity: 'redirect',
        entityId: 'r1',
        metadata: { shortcode: 'grandma' },
      })
    )
  })

  it('preserves last_verified_at when the inserted redirect row includes it', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle.mockResolvedValue({
      data: {
        id: 'r1',
        shortcode: 'grandma',
        target_url: 'https://example.com/memorials/x',
        print_status: 'verified',
        last_verified_at: '2026-01-05T00:00:00Z',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(201)
    expect(payload.redirect).toMatchObject({
      print_status: 'verified',
      last_verified_at: '2026-01-05T00:00:00Z',
    })
  })

  it('falls back to legacy redirect inserts and normalizes the response payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle
      .mockResolvedValueOnce({ data: null, error: { code: '42703' } })
      .mockResolvedValueOnce({
        data: {
          id: 'r1',
          shortcode: 'grandma',
          target_url: 'https://example.com/memorials/x',
          created_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenNthCalledWith(1, {
      shortcode: 'grandma',
      target_url: 'https://example.com/memorials/x',
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_by: 'user-1',
    })
    expect(mockInsert).toHaveBeenNthCalledWith(2, {
      shortcode: 'grandma',
      target_url: 'https://example.com/memorials/x',
      created_by: 'user-1',
    })
    expect(payload.redirect).toEqual({
      id: 'r1',
      shortcode: 'grandma',
      target_url: 'https://example.com/memorials/x',
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    })
    expect(mockLogAdminAudit).toHaveBeenCalledTimes(1)
  })

  it('returns schema mismatch when the legacy fallback insert still fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle
      .mockResolvedValueOnce({ data: null, error: { code: '42703' } })
      .mockResolvedValueOnce({ data: null, error: { code: '42P01' } })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns shortcode conflict when the insert hits a unique violation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle.mockResolvedValue({
      data: null,
      error: { code: '23505' },
    })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: 'SHORTCODE_EXISTS',
      message: 'This short code is already in use.',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns database error for non-schema insert failures', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsertSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const req = new Request('http://localhost/api/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shortcode: 'Grandma',
        targetUrl: 'https://example.com/memorials/x',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      code: 'DATABASE_ERROR',
      message: 'Unable to create redirect right now.',
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
