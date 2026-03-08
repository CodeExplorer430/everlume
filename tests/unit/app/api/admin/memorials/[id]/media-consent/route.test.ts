import { GET } from '@/app/api/admin/memorials/[id]/media-consent/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({ eq: mockPageEqOwner }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))
const mockConsentLimit = vi.fn()
const mockConsentOrder = vi.fn(() => ({ limit: mockConsentLimit }))
const mockConsentEq = vi.fn(() => ({ order: mockConsentOrder }))
const mockConsentSelect = vi.fn(() => ({ eq: mockConsentEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'media_access_consents') return { select: mockConsentSelect }
      return { select: mockPageSelect }
    },
  }),
}))

describe('GET /api/admin/memorials/[id]/media-consent', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockConsentLimit.mockReset()
    mockProfileSingle.mockResolvedValue({ data: { role: 'viewer', is_active: true }, error: null })
  })

  it('returns consent records for an owned memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockConsentLimit.mockResolvedValue({
      data: [{ id: 'c1', event_type: 'consent_granted', access_mode: 'password', consent_source: 'protected_media_gate', media_kind: null, media_variant: null, ip_hash: 'iphash', user_agent_hash: 'uahash', created_at: '2026-03-09T00:00:00.000Z' }],
      error: null,
    })

    const req = new Request('http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent')
    const res = await GET(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      logs: [expect.objectContaining({ id: 'c1', event_type: 'consent_granted' })],
    })
  })

  it('returns forbidden when the user does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent')
    const res = await GET(req as never, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) })

    expect(res.status).toBe(403)
  })
})
