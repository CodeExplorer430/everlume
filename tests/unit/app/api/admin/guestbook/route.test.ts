import { GET } from '@/app/api/admin/guestbook/route'

const mockRequireAdminUser = vi.fn()
const mockPagesEq = vi.fn()
const mockPagesSelect = vi.fn()
const mockGuestbookOrder = vi.fn()
const mockGuestbookIn = vi.fn(() => ({ order: mockGuestbookOrder }))
const mockGuestbookSelect = vi.fn(() => ({ in: mockGuestbookIn }))

vi.mock('@/lib/server/admin-auth', () => ({
  requireAdminUser: (...args: unknown[]) => mockRequireAdminUser(...args),
  databaseError: (message: string) =>
    new Response(JSON.stringify({ code: 'DATABASE_ERROR', message }), {
      status: 500,
    }),
}))

function createPagesQuery(
  result:
    | Promise<{ data: unknown; error: unknown }>
    | { data: unknown; error: unknown }
) {
  const query = Promise.resolve(result) as Promise<{
    data: unknown
    error: unknown
  }> & {
    eq: typeof mockPagesEq
  }
  query.eq = mockPagesEq
  return query
}

describe('GET /api/admin/guestbook', () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset()
    mockPagesEq.mockReset()
    mockPagesSelect.mockReset()
    mockGuestbookOrder.mockReset()
    mockGuestbookIn.mockClear()
    mockGuestbookSelect.mockClear()
  })

  it('returns the auth failure response when admin access is denied', async () => {
    mockRequireAdminUser.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns entries for owners and keeps the expected query shape', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockGuestbookOrder.mockResolvedValue({
      data: [
        {
          id: 'g1',
          name: 'Visitor',
          message: 'Hello',
          is_approved: false,
          created_at: '2026-01-01T00:00:00.000Z',
          page_id: 'page-1',
        },
      ],
      error: null,
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.entries).toHaveLength(1)
    expect(payload.entries[0].pages.title).toBe('My Page')
    expect(mockPagesSelect).toHaveBeenCalledWith('id, title')
    expect(mockPagesEq).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(mockGuestbookSelect).toHaveBeenCalledWith(
      'id, name, message, is_approved, created_at, page_id'
    )
    expect(mockGuestbookIn).toHaveBeenCalledWith('page_id', ['page-1'])
    expect(mockGuestbookOrder).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
  })

  it('does not scope pages for admins and falls back to a null title', async () => {
    mockPagesSelect.mockReturnValue(
      createPagesQuery({
        data: [{ id: 'page-1', title: null }],
        error: null,
      })
    )
    mockGuestbookOrder.mockResolvedValue({
      data: [
        {
          id: 'g1',
          name: 'Visitor',
          message: 'Hello',
          is_approved: true,
          created_at: '2026-01-01T00:00:00.000Z',
          page_id: 'page-1',
        },
      ],
      error: null,
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      role: 'admin',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(mockPagesEq).not.toHaveBeenCalled()
    expect(payload.entries[0].pages.title).toBeNull()
  })

  it('normalizes null guestbook query data to an empty list', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockGuestbookOrder.mockResolvedValue({ data: null, error: null })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.entries).toEqual([])
  })

  it('returns empty when there are no owned pages and skips the guestbook query', async () => {
    mockPagesEq.mockReturnValue(Promise.resolve({ data: [], error: null }))
    mockPagesSelect.mockReturnValue(createPagesQuery({ data: [], error: null }))
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload.entries).toEqual([])
    expect(mockGuestbookSelect).not.toHaveBeenCalled()
  })

  it('returns schema mismatch when the pages query uses an outdated schema', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({ data: null, error: { code: '42703' } })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({ data: null, error: { code: '42703' } })
    )
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })

  it('returns a database error when the pages query fails generically', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({ data: null, error: { message: 'failed' } })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({ data: null, error: { message: 'failed' } })
    )
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'DATABASE_ERROR',
      message: 'Unable to load guestbook entries.',
    })
  })

  it('returns schema mismatch when the guestbook query uses an outdated schema', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockGuestbookOrder.mockResolvedValue({
      data: null,
      error: { code: '42P01' },
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'SCHEMA_MISMATCH',
      message:
        'Database schema is outdated. Run the latest Supabase migrations.',
    })
  })

  it('returns a database error when the guestbook query fails generically', async () => {
    mockPagesEq.mockReturnValue(
      Promise.resolve({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockPagesSelect.mockReturnValue(
      createPagesQuery({
        data: [{ id: 'page-1', title: 'My Page' }],
        error: null,
      })
    )
    mockGuestbookOrder.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    })
    mockRequireAdminUser.mockResolvedValue({
      ok: true,
      userId: 'user-1',
      role: 'editor',
      supabase: {
        from: (table: string) => {
          if (table === 'pages') {
            return { select: mockPagesSelect }
          }

          if (table === 'guestbook') {
            return { select: mockGuestbookSelect }
          }

          return { select: vi.fn() }
        },
      },
    })

    const res = await GET()
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'DATABASE_ERROR',
      message: 'Unable to load guestbook entries.',
    })
  })
})
