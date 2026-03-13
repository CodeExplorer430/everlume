import { GET, POST } from '@/app/api/admin/memorials/[id]/media-consent/route'

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }))
const mockPageSingle = vi.fn()
const mockPageEqOwner = vi.fn(() => ({ single: mockPageSingle }))
const mockPageEqId = vi.fn(() => ({
  eq: mockPageEqOwner,
  single: mockPageSingle,
}))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEqId }))
const mockPageUpdateEq = vi.fn()
const mockPageUpdate = vi.fn(() => ({ eq: mockPageUpdateEq }))
const mockConsentLimit = vi.fn()
const mockConsentOrder = vi.fn(() => ({ limit: mockConsentLimit }))
const mockConsentEq = vi.fn(() => ({ order: mockConsentOrder }))
const mockConsentSelect = vi.fn(() => ({ eq: mockConsentEq }))
const mockSiteSettingsSingle = vi.fn()
const mockLogAdminAudit = vi.fn()

vi.mock('@/lib/server/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'media_access_consents') {
        return { select: mockConsentSelect }
      }
      if (table === 'site_settings') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSiteSettingsSingle,
            }),
          }),
        }
      }
      return { select: mockPageSelect, update: mockPageUpdate }
    },
  }),
}))

describe('GET /api/admin/memorials/[id]/media-consent', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockPageEqId.mockClear()
    mockPageEqOwner.mockClear()
    mockConsentEq.mockClear()
    mockConsentOrder.mockClear()
    mockConsentLimit.mockReset()
    mockSiteSettingsSingle.mockReset()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'viewer', is_active: true },
      error: null,
    })
    mockSiteSettingsSingle.mockResolvedValue({
      data: { protected_media_consent_version: 3 },
      error: null,
    })
  })

  it('returns 400 for an invalid memorial id', async () => {
    const req = new Request(
      'http://localhost/api/admin/memorials/not-a-uuid/media-consent'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns unauthorized when the user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('returns forbidden when the user does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent'
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
    expect(mockConsentSelect).not.toHaveBeenCalled()
  })

  it('returns consent records for an owned memorial and preserves query shape', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle
      .mockResolvedValueOnce({ data: { id: 'page-1' } })
      .mockResolvedValueOnce({
        data: { title: 'Memorial Title', media_consent_revoked_at: null },
      })
    mockConsentLimit.mockResolvedValue({
      data: [
        {
          id: 'c1',
          event_type: 'consent_granted',
          access_mode: 'password',
          consent_source: 'protected_media_gate',
          consent_version: 3,
          media_kind: null,
          media_variant: null,
          ip_hash: 'iphash',
          user_agent_hash: 'uahash',
          created_at: '2026-03-09T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    expect(mockConsentEq).toHaveBeenCalledWith(
      'page_id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockConsentOrder).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    expect(mockConsentLimit).toHaveBeenCalledWith(100)
    await expect(res.json()).resolves.toMatchObject({
      logs: [
        expect.objectContaining({
          id: 'c1',
          event_type: 'consent_granted',
          consent_version: 3,
        }),
      ],
      consentNoticeVersion: 3,
      memorial: expect.objectContaining({ title: 'Memorial Title' }),
    })
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns fallback memorial metadata and default notice version when no rows exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle
      .mockResolvedValueOnce({ data: { id: 'page-1' } })
      .mockResolvedValueOnce({ data: null, error: null })
    mockSiteSettingsSingle.mockResolvedValue({ data: null, error: null })
    mockConsentLimit.mockResolvedValue({ data: null, error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      logs: [],
      memorial: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Untitled memorial',
        mediaConsentRevokedAt: null,
      },
      consentNoticeVersion: 1,
    })
  })

  it('returns a database error when the consent log query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle
      .mockResolvedValueOnce({ data: { id: 'page-1' } })
      .mockResolvedValueOnce({ data: { title: 'Memorial Title' } })
    mockConsentLimit.mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent'
    )
    const res = await GET(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/memorials/[id]/media-consent', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileSingle.mockReset()
    mockPageSingle.mockReset()
    mockPageUpdate.mockClear()
    mockPageUpdateEq.mockReset()
    mockPageEqId.mockClear()
    mockPageEqOwner.mockClear()
    mockLogAdminAudit.mockReset()
    mockProfileSingle.mockResolvedValue({
      data: { role: 'editor', is_active: true },
      error: null,
    })
  })

  it('returns 400 for an invalid memorial id', async () => {
    const req = new Request(
      'http://localhost/api/admin/memorials/not-a-uuid/media-consent',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns unauthorized when the user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(401)
    expect(mockPageUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('returns forbidden when the user does not own the memorial', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(403)
    expect(mockPageUpdate).not.toHaveBeenCalled()
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })

  it('revokes protected media consent and audits only on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPageUpdateEq.mockResolvedValue({ error: null })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload).toMatchObject({
      ok: true,
      revokedAt: expect.any(String),
    })

    expect(mockPageUpdate).toHaveBeenCalled()
    const updateCalls = mockPageUpdate.mock.calls as unknown[][]
    const updatePayload = updateCalls[0]?.[0] as
      | {
          media_consent_revoked_at: string
          updated_at: string
        }
      | undefined
    if (!updatePayload) {
      throw new Error('Expected pages update to be called.')
    }
    expect(updatePayload.media_consent_revoked_at).toBe(
      updatePayload.updated_at
    )
    expect(updatePayload.media_consent_revoked_at).toBe(payload.revokedAt)
    expect(mockPageUpdateEq).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000'
    )
    expect(mockLogAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'user-1',
        action: 'media_consent.revoke',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
        metadata: { revokedAt: payload.revokedAt },
      })
    )
  })

  it('returns a database error when revocation cannot be persisted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockPageSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockPageUpdateEq.mockResolvedValue({ error: { message: 'write failed' } })

    const req = new Request(
      'http://localhost/api/admin/memorials/550e8400-e29b-41d4-a716-446655440000/media-consent',
      { method: 'POST' }
    )
    const res = await POST(req as never, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    })

    expect(res.status).toBe(500)
    expect(mockLogAdminAudit).not.toHaveBeenCalled()
  })
})
