import {
  createPageAccessToken,
  getPageAccessCookieName,
  getPageAccessCookieMaxAge,
  hashPagePassword,
  verifyPageAccessToken,
  verifyPagePassword,
} from '@/lib/server/page-password'

describe('page-password helpers', () => {
  it('hashes and verifies passwords', () => {
    const hash = hashPagePassword('secret-123')
    expect(hash.startsWith('pbkdf2$')).toBe(true)
    expect(verifyPagePassword('secret-123', hash)).toBe(true)
    expect(verifyPagePassword('wrong', hash)).toBe(false)
  })

  it('creates and verifies page access tokens', () => {
    const token = createPageAccessToken('page-1', '2026-03-06T00:00:00.000Z')
    expect(verifyPageAccessToken(token, 'page-1', '2026-03-06T00:00:00.000Z')).toBe(true)
    expect(verifyPageAccessToken(token, 'page-2', '2026-03-06T00:00:00.000Z')).toBe(false)
  })

  it('provides stable cookie metadata', () => {
    expect(getPageAccessCookieName('abc')).toBe('everlume_page_access_abc')
    expect(getPageAccessCookieMaxAge()).toBeGreaterThan(0)
  })
})
