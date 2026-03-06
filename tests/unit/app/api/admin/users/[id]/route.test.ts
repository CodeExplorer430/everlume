import { DELETE, PATCH } from '@/app/api/admin/users/[id]/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))

const mockTargetSingle = vi.fn()
const mockTargetEq = vi.fn(() => ({ single: mockTargetSingle }))

const mockCountEqRole = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ count: 1 })) }))

const mockUpdateSingle = vi.fn()
const mockUpdateEq = vi.fn<
  () => { select: () => { single: typeof mockUpdateSingle } } | Promise<{ error: null }>
>(() => ({ select: () => ({ single: mockUpdateSingle }) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table !== 'profiles') return { select: vi.fn(), update: vi.fn() }

      return {
        select: (columns: string, options?: { head?: boolean; count?: string }) => {
          if (columns === 'role, is_active') return { eq: mockProfileEq }
          if (options?.head) return { eq: mockCountEqRole }
          return { eq: mockTargetEq }
        },
        update: mockUpdate,
      }
    },
  }),
}))

describe('admin users [id] route', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockTargetSingle.mockReset()
    mockUpdateSingle.mockReset()
    mockUpdate.mockReset()
  })

  it('returns 409 when trying to deactivate last active admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({ data: { id: 'admin-1', role: 'admin', is_active: true }, error: null })

    const req = new Request('http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })

    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(409)
  })

  it('updates user role successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({ data: { id: 'user-2', role: 'editor', is_active: true }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: { id: 'user-2', role: 'viewer' }, error: null })

    const req = new Request('http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'viewer' }),
    })

    const res = await PATCH(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
  })

  it('deletes/deactivates user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockProfileSingle.mockResolvedValue({ data: { role: 'admin', is_active: true }, error: null })
    mockTargetSingle.mockResolvedValue({ data: { id: 'user-2', role: 'viewer', is_active: true }, error: null })
    mockUpdateEq.mockReturnValueOnce(Promise.resolve({ error: null }))

    const req = new Request('http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440000', {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })
    expect(res.status).toBe(200)
  })
})
