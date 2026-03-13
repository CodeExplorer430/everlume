import { NextRequest, NextResponse } from 'next/server'

const mockCookieGet = vi.fn()
const mockCookies = vi.fn(async () => ({
  get: mockCookieGet,
}))

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

import {
  E2E_AUTH_COOKIE,
  applyE2EAuthSession,
  authenticateE2EUser,
  clearE2EAuthSession,
  completeE2EPasswordReset,
  getE2EAuthSession,
  getE2EAuthSessionFromCookieSource,
  getE2EAuthSessionFromRequest,
  requestE2EPasswordReset,
  resetE2EAuthFixtures,
} from '@/lib/server/e2e-auth'

describe('e2e-auth helpers', () => {
  beforeEach(() => {
    mockCookieGet.mockReset()
    mockCookies.mockClear()
    resetE2EAuthFixtures()
  })

  it('reinitializes the mutable fixture users when the global store is missing', () => {
    globalThis.__EVERLUME_E2E_AUTH_USERS__ = undefined

    expect(
      authenticateE2EUser('e2e-admin@everlume.local', 'Everlume123!')
    ).toEqual(
      expect.objectContaining({
        ok: true,
        session: expect.objectContaining({
          email: 'e2e-admin@everlume.local',
          state: 'active',
        }),
      })
    )
  })

  it('returns null for missing, malformed, or partial session cookies', async () => {
    mockCookieGet.mockReturnValue(undefined)
    await expect(getE2EAuthSession()).resolves.toBeNull()

    expect(
      getE2EAuthSessionFromCookieSource({
        get: () => ({ value: '{' }),
      })
    ).toBeNull()

    expect(
      getE2EAuthSessionFromCookieSource({
        get: () => ({
          value: JSON.stringify({
            userId: 'user-1',
            email: 'e2e-admin@everlume.local',
          }),
        }),
      })
    ).toBeNull()
  })

  it('reads a valid session from next headers, requests, and cookie sources', async () => {
    const session = {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'e2e-admin@everlume.local',
      role: 'admin' as const,
      isActive: true,
      fullName: 'E2E Admin',
      state: 'active' as const,
    }
    const cookieValue = JSON.stringify(session)
    mockCookieGet.mockReturnValue({ value: cookieValue })

    await expect(getE2EAuthSession()).resolves.toEqual(session)

    const request = new NextRequest('http://localhost/admin', {
      headers: {
        cookie: `${E2E_AUTH_COOKIE}=${encodeURIComponent(cookieValue)}`,
      },
    })
    expect(getE2EAuthSessionFromRequest(request)).toEqual(session)
    expect(
      getE2EAuthSessionFromCookieSource({
        get: () => ({ value: cookieValue }),
      })
    ).toEqual(session)
  })

  it('applies and clears the fake auth session cookie with the expected attributes', () => {
    const response = NextResponse.json({ ok: true })
    const session = {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'e2e-admin@everlume.local',
      role: 'admin' as const,
      isActive: true,
      fullName: 'E2E Admin',
      state: 'active' as const,
    }

    applyE2EAuthSession(response, session)
    const appliedCookie = response.headers.get('set-cookie')

    expect(appliedCookie).toContain(`${E2E_AUTH_COOKIE}=`)
    expect(appliedCookie).toContain('HttpOnly')
    expect(appliedCookie).toContain('Max-Age=3600')
    expect(appliedCookie).toContain('SameSite=lax')

    clearE2EAuthSession(response)
    const clearedCookie = response.headers.getSetCookie().at(-1)

    expect(clearedCookie).toContain(`${E2E_AUTH_COOKIE}=;`)
    expect(clearedCookie).toContain('Max-Age=0')
    expect(clearedCookie).toContain('HttpOnly')
  })

  it('authenticates active users and rejects invalid, invited, and deactivated accounts', () => {
    expect(authenticateE2EUser('e2e-admin@everlume.local', 'wrong')).toEqual({
      ok: false,
      status: 401,
      message: 'Invalid email or password.',
    })

    expect(
      authenticateE2EUser('pending-admin@everlume.local', 'Everlume123!')
    ).toEqual({
      ok: false,
      status: 403,
      message: 'This account is still pending password setup.',
    })

    expect(
      authenticateE2EUser('inactive-admin@everlume.local', 'Everlume123!')
    ).toEqual({
      ok: false,
      status: 403,
      message: 'This account has been deactivated.',
    })

    expect(
      authenticateE2EUser('  E2E-ADMIN@everlume.local  ', 'Everlume123!')
    ).toEqual(
      expect.objectContaining({
        ok: true,
        session: expect.objectContaining({
          email: 'e2e-admin@everlume.local',
          role: 'admin',
          state: 'active',
        }),
      })
    )
  })

  it('returns reset paths for known users and omits them for unknown users', () => {
    expect(requestE2EPasswordReset('e2e-admin@everlume.local')).toEqual({
      ok: true,
      resetPath: '/login/reset-password?email=e2e-admin%40everlume.local',
    })

    expect(requestE2EPasswordReset('missing@everlume.local')).toEqual({
      ok: true,
      resetPath: null,
    })
  })

  it('completes password resets, rejects missing or deactivated accounts, and resets fixture state', () => {
    expect(
      completeE2EPasswordReset('missing@everlume.local', 'NewPassword123!')
    ).toEqual({
      ok: false,
      status: 404,
      message: 'Account not found.',
    })

    expect(
      completeE2EPasswordReset(
        'inactive-admin@everlume.local',
        'NewPassword123!'
      )
    ).toEqual({
      ok: false,
      status: 403,
      message: 'This account has been deactivated.',
    })

    expect(
      completeE2EPasswordReset(
        'pending-admin@everlume.local',
        'NewPassword123!'
      )
    ).toEqual(
      expect.objectContaining({
        ok: true,
        session: expect.objectContaining({
          email: 'pending-admin@everlume.local',
          state: 'active',
        }),
      })
    )
    expect(
      authenticateE2EUser('pending-admin@everlume.local', 'NewPassword123!')
    ).toEqual(
      expect.objectContaining({
        ok: true,
        session: expect.objectContaining({ state: 'active' }),
      })
    )

    resetE2EAuthFixtures()

    expect(
      authenticateE2EUser('pending-admin@everlume.local', 'Everlume123!')
    ).toEqual({
      ok: false,
      status: 403,
      message: 'This account is still pending password setup.',
    })
  })
})
