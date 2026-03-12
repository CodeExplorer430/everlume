import { NextRequest } from 'next/server'
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockCreateServiceRoleClient = vi.fn(() => ({ from: mockFrom }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

import {
  buildMemorialMediaConsentRecord,
  createMemorialMediaConsentToken,
  getMemorialMediaConsentCookieName,
  getMemorialMediaConsentCookieMaxAge,
  insertMemorialMediaConsent,
  tryInsertMemorialMediaAccess,
  verifyMemorialMediaConsentToken,
} from '@/lib/server/media-consent'

describe('media consent helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockInsert.mockReset()
    mockFrom.mockClear()
    mockCreateServiceRoleClient.mockClear()
  })

  it('creates and verifies a memorial media consent token', () => {
    const token = createMemorialMediaConsentToken({
      memorialId: 'memorial-1',
      passwordUpdatedAt: '2026-03-09T00:00:00.000Z',
      consentVersion: 3,
      consentRevokedAt: null,
    })

    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        3,
        null
      )
    ).toBe(true)
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-1',
        '2026-03-10T00:00:00.000Z',
        3,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-2',
        '2026-03-09T00:00:00.000Z',
        3,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        4,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        3,
        '2026-03-09T12:00:00.000Z'
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        'bad-token',
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        3,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        undefined,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        3,
        null
      )
    ).toBe(false)
  })

  it('creates and verifies tokens when password and revocation versions are unset', () => {
    const token = createMemorialMediaConsentToken({
      memorialId: 'memorial-2',
      passwordUpdatedAt: null,
      consentVersion: 1,
      consentRevokedAt: null,
    })

    expect(
      verifyMemorialMediaConsentToken(token, 'memorial-2', null, 1, null)
    ).toBe(true)
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-2',
        '2026-03-09',
        1,
        null
      )
    ).toBe(false)
  })

  it('rejects consent tokens outside the valid time window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-09T00:00:00.000Z'))

    const token = createMemorialMediaConsentToken({
      memorialId: 'memorial-1',
      passwordUpdatedAt: '2026-03-09T00:00:00.000Z',
      consentVersion: 1,
      consentRevokedAt: null,
    })

    vi.setSystemTime(new Date('2026-03-09T12:00:01.000Z'))
    expect(
      verifyMemorialMediaConsentToken(
        token,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        1,
        null
      )
    ).toBe(false)

    vi.useRealTimers()
  })

  it('rejects malformed, future-dated, and signature-mismatched consent tokens', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-09T00:00:00.000Z'))

    const validToken = createMemorialMediaConsentToken({
      memorialId: 'memorial-1',
      passwordUpdatedAt: '2026-03-09T00:00:00.000Z',
      consentVersion: 2,
      consentRevokedAt: null,
    })

    const segments = validToken.split('.')
    const futureToken = [
      segments[0],
      segments[1],
      String(Number(segments[2]) + 60),
      segments[3],
      segments[4],
      segments[5],
      segments[6],
    ].join('.')
    const badSignatureToken = [...segments.slice(0, 6), 'bad-signature'].join(
      '.'
    )
    const invalidVersionToken = [
      segments[0],
      segments[1],
      segments[2],
      segments[3],
      'not-a-number',
      segments[5],
      segments[6],
    ].join('.')
    const invalidIssuedAtToken = [
      segments[0],
      segments[1],
      'not-a-number',
      segments[3],
      segments[4],
      segments[5],
      segments[6],
    ].join('.')

    expect(
      verifyMemorialMediaConsentToken(
        'too-short.token',
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        2,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        invalidIssuedAtToken,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        2,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        futureToken,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        2,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        invalidVersionToken,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        2,
        null
      )
    ).toBe(false)
    expect(
      verifyMemorialMediaConsentToken(
        badSignatureToken,
        'memorial-1',
        '2026-03-09T00:00:00.000Z',
        2,
        null
      )
    ).toBe(false)

    vi.useRealTimers()
  })

  it('builds hashed visitor metadata for consent records', () => {
    const request = new NextRequest(
      'http://localhost/api/public/memorials/jane/media-consent',
      {
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'EverlumeTestAgent/1.0',
        },
      }
    )

    const record = buildMemorialMediaConsentRecord({
      request,
      memorialId: 'memorial-1',
      accessMode: 'password',
      consentVersion: 2,
      eventType: 'consent_granted',
    })

    expect(record).toMatchObject({
      page_id: 'memorial-1',
      access_mode: 'password',
      event_type: 'consent_granted',
      consent_source: 'protected_media_gate',
    })
    expect(record.ip_hash).not.toContain('203.0.113.10')
    expect(record.user_agent_hash).not.toContain('EverlumeTestAgent')
  })

  it('falls back to x-real-ip and unknown user agent when forwarded headers are absent', () => {
    const request = new NextRequest(
      'http://localhost/api/public/memorials/jane/media-consent',
      {
        headers: {
          'x-real-ip': '198.51.100.20',
        },
      }
    )

    const record = buildMemorialMediaConsentRecord({
      request,
      memorialId: 'memorial-1',
      accessMode: 'password',
      consentVersion: 2,
      eventType: 'media_accessed',
      mediaKind: 'gallery_image',
      mediaVariant: 'image',
      photoId: 'photo-1',
    })

    expect(record).toMatchObject({
      page_id: 'memorial-1',
      photo_id: 'photo-1',
      media_kind: 'gallery_image',
      media_variant: 'image',
      event_type: 'media_accessed',
    })
    expect(record.ip_hash).not.toContain('198.51.100.20')
    expect(record.user_agent_hash).toBeTruthy()
  })

  it('falls back to unknown when the forwarded-for header is blank after trimming', () => {
    const blankForwardedRequest = new NextRequest(
      'http://localhost/api/public/memorials/jane/media-consent',
      {
        headers: {
          'x-forwarded-for': '   ',
        },
      }
    )
    const unknownRequest = new NextRequest(
      'http://localhost/api/public/memorials/jane/media-consent'
    )

    const blankForwardedRecord = buildMemorialMediaConsentRecord({
      request: blankForwardedRequest,
      memorialId: 'memorial-1',
      accessMode: 'password',
      consentVersion: 2,
      eventType: 'consent_granted',
    })
    const unknownRecord = buildMemorialMediaConsentRecord({
      request: unknownRequest,
      memorialId: 'memorial-1',
      accessMode: 'password',
      consentVersion: 2,
      eventType: 'consent_granted',
    })

    expect(blankForwardedRecord.ip_hash).toBe(unknownRecord.ip_hash)
  })

  it('records media consent through the service-role client', async () => {
    mockInsert.mockResolvedValue({ error: null })
    const request = new NextRequest('http://localhost/api/public/media')

    await insertMemorialMediaConsent({
      request,
      memorialId: 'memorial-1',
      accessMode: 'password',
      consentVersion: 2,
      eventType: 'media_accessed',
      mediaKind: 'gallery_thumb',
      mediaVariant: 'thumb',
      photoId: 'photo-1',
    })

    expect(mockCreateServiceRoleClient).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalledWith('media_access_consents')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: 'memorial-1',
        photo_id: 'photo-1',
        media_kind: 'gallery_thumb',
        media_variant: 'thumb',
        event_type: 'media_accessed',
      })
    )
  })

  it('throws insert errors and swallows them in tryInsertMemorialMediaAccess', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const request = new NextRequest('http://localhost/api/public/media')

    mockInsert.mockResolvedValueOnce({
      error: { message: 'db failed' },
    })
    await expect(
      insertMemorialMediaConsent({
        request,
        memorialId: 'memorial-1',
        accessMode: 'password',
        consentVersion: 2,
        eventType: 'consent_granted',
      })
    ).rejects.toThrow('db failed')

    mockInsert.mockResolvedValueOnce({
      error: { message: 'db failed again' },
    })
    await expect(
      tryInsertMemorialMediaAccess({
        request,
        memorialId: 'memorial-1',
        accessMode: 'password',
        consentVersion: 2,
        eventType: 'media_accessed',
      })
    ).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith(
      'Protected media access logging failed.',
      expect.any(Error)
    )
  })

  it('uses the default insert error message when the database error is blank', async () => {
    const request = new NextRequest('http://localhost/api/public/media')
    mockInsert.mockResolvedValue({
      error: { message: '' },
    })

    await expect(
      insertMemorialMediaConsent({
        request,
        memorialId: 'memorial-1',
        accessMode: 'password',
        consentVersion: 2,
        eventType: 'consent_granted',
      })
    ).rejects.toThrow('Unable to record media consent.')
  })

  it('exposes stable cookie helpers', () => {
    expect(getMemorialMediaConsentCookieName('memorial-1')).toBe(
      'everlume_memorial_media_consent_memorial-1'
    )
    expect(getMemorialMediaConsentCookieMaxAge()).toBe(60 * 60 * 12)
  })
})
