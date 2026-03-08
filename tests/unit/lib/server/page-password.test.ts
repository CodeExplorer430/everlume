import {
  createMemorialAccessToken,
  getMemorialAccessCookieName,
  getMemorialAccessCookieMaxAge,
  hashMemorialPassword,
  verifyMemorialAccessToken,
  verifyMemorialPassword,
} from '@/lib/server/page-password'

describe('memorial password helpers', () => {
  it('hashes and verifies passwords', () => {
    const hash = hashMemorialPassword('secret-123')
    expect(hash.startsWith('pbkdf2$')).toBe(true)
    expect(verifyMemorialPassword('secret-123', hash)).toBe(true)
    expect(verifyMemorialPassword('wrong', hash)).toBe(false)
  })

  it('creates and verifies memorial access tokens', () => {
    const token = createMemorialAccessToken('page-1', '2026-03-06T00:00:00.000Z')
    expect(verifyMemorialAccessToken(token, 'page-1', '2026-03-06T00:00:00.000Z')).toBe(true)
    expect(verifyMemorialAccessToken(token, 'page-2', '2026-03-06T00:00:00.000Z')).toBe(false)
  })

  it('provides stable cookie metadata', () => {
    expect(getMemorialAccessCookieName('abc')).toBe('everlume_memorial_access_abc')
    expect(getMemorialAccessCookieMaxAge()).toBeGreaterThan(0)
  })
})
