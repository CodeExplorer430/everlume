import { NextRequest } from 'next/server'
import {
  buildMemorialMediaConsentRecord,
  createMemorialMediaConsentToken,
  getMemorialMediaConsentCookieName,
  getMemorialMediaConsentCookieMaxAge,
  verifyMemorialMediaConsentToken,
} from '@/lib/server/media-consent'

describe('media consent helpers', () => {
  it('creates and verifies a memorial media consent token', () => {
    const token = createMemorialMediaConsentToken({
      memorialId: 'memorial-1',
      passwordUpdatedAt: '2026-03-09T00:00:00.000Z',
      consentVersion: 3,
      consentRevokedAt: null,
    })

    expect(verifyMemorialMediaConsentToken(token, 'memorial-1', '2026-03-09T00:00:00.000Z', 3, null)).toBe(true)
    expect(verifyMemorialMediaConsentToken(token, 'memorial-1', '2026-03-10T00:00:00.000Z', 3, null)).toBe(false)
    expect(verifyMemorialMediaConsentToken(token, 'memorial-2', '2026-03-09T00:00:00.000Z', 3, null)).toBe(false)
    expect(verifyMemorialMediaConsentToken(token, 'memorial-1', '2026-03-09T00:00:00.000Z', 4, null)).toBe(false)
    expect(verifyMemorialMediaConsentToken(token, 'memorial-1', '2026-03-09T00:00:00.000Z', 3, '2026-03-09T12:00:00.000Z')).toBe(false)
    expect(verifyMemorialMediaConsentToken('bad-token', 'memorial-1', '2026-03-09T00:00:00.000Z', 3, null)).toBe(false)
    expect(verifyMemorialMediaConsentToken(undefined, 'memorial-1', '2026-03-09T00:00:00.000Z', 3, null)).toBe(false)
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
    expect(verifyMemorialMediaConsentToken(token, 'memorial-1', '2026-03-09T00:00:00.000Z', 1, null)).toBe(false)

    vi.useRealTimers()
  })

  it('builds hashed visitor metadata for consent records', () => {
    const request = new NextRequest('http://localhost/api/public/memorials/jane/media-consent', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
        'user-agent': 'EverlumeTestAgent/1.0',
      },
    })

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
    const request = new NextRequest('http://localhost/api/public/memorials/jane/media-consent', {
      headers: {
        'x-real-ip': '198.51.100.20',
      },
    })

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

  it('exposes stable cookie helpers', () => {
    expect(getMemorialMediaConsentCookieName('memorial-1')).toBe('everlume_memorial_media_consent_memorial-1')
    expect(getMemorialMediaConsentCookieMaxAge()).toBe(60 * 60 * 12)
  })
})
