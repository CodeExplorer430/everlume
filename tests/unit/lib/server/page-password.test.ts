import {
  createMemorialAccessToken,
  getMemorialAccessCookieName,
  getMemorialAccessCookieMaxAge,
  hashMemorialPassword,
  verifyMemorialAccessToken,
  verifyMemorialPassword,
} from '@/lib/server/page-password'

describe('memorial password helpers', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('hashes and verifies passwords', () => {
    const hash = hashMemorialPassword('secret-123')
    expect(hash.startsWith('pbkdf2$')).toBe(true)
    expect(verifyMemorialPassword('secret-123', hash)).toBe(true)
    expect(verifyMemorialPassword('wrong', hash)).toBe(false)
  })

  it('rejects malformed password hashes', () => {
    expect(verifyMemorialPassword('secret-123', null)).toBe(false)
    expect(
      verifyMemorialPassword('secret-123', 'argon2$120000$salt$hash')
    ).toBe(false)
    expect(verifyMemorialPassword('secret-123', 'pbkdf2$0$salt$hash')).toBe(
      false
    )
    expect(verifyMemorialPassword('secret-123', 'pbkdf2$120000$salt$aa')).toBe(
      false
    )
  })

  it('creates and verifies memorial access tokens', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T00:00:00.000Z'))

    const token = createMemorialAccessToken(
      'page-1',
      '2026-03-06T00:00:00.000Z'
    )
    expect(
      verifyMemorialAccessToken(token, 'page-1', '2026-03-06T00:00:00.000Z')
    ).toBe(true)
    expect(
      verifyMemorialAccessToken(token, 'page-2', '2026-03-06T00:00:00.000Z')
    ).toBe(false)
  })

  it('rejects malformed memorial access tokens', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T00:00:00.000Z'))

    const token = createMemorialAccessToken(
      'page-1',
      '2026-03-06T00:00:00.000Z'
    )
    const [, memorialId, issuedAt, passwordVersion, signature] =
      token.split('.')

    expect(verifyMemorialAccessToken(undefined, 'page-1', null)).toBe(false)
    expect(
      verifyMemorialAccessToken('v1.page-1.only-four.segments', 'page-1', null)
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `v2.${memorialId}.${issuedAt}.${passwordVersion}.${signature}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `v1.${memorialId}.not-a-number.${passwordVersion}.${signature}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `v1.${memorialId}.${Number(issuedAt) + 60}.${passwordVersion}.${signature}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `v1.${memorialId}.${Number(issuedAt) - getMemorialAccessCookieMaxAge() - 1}.${passwordVersion}.${signature}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
  })

  it('rejects memorial access tokens when the password version or signature is invalid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T00:00:00.000Z'))

    const token = createMemorialAccessToken(
      'page-1',
      '2026-03-06T00:00:00.000Z'
    )
    const [version, memorialId, issuedAt, passwordVersion, signature] =
      token.split('.')

    expect(
      verifyMemorialAccessToken(token, 'page-1', '2026-03-07T00:00:00.000Z')
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `${version}.${memorialId}.${issuedAt}.${passwordVersion}.${signature.slice(0, -1)}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
    expect(
      verifyMemorialAccessToken(
        `${version}.${memorialId}.${issuedAt}.${passwordVersion}.${`${signature.slice(0, -1)}A`}`,
        'page-1',
        '2026-03-06T00:00:00.000Z'
      )
    ).toBe(false)
  })

  it('provides stable cookie metadata', () => {
    expect(getMemorialAccessCookieName('abc')).toBe(
      'everlume_memorial_access_abc'
    )
    expect(getMemorialAccessCookieMaxAge()).toBeGreaterThan(0)
  })
})
