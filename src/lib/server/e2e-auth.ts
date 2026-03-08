import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export type E2EAuthRole = 'admin' | 'editor' | 'viewer'
export type E2EAuthState = 'active' | 'invited' | 'deactivated'

export type E2EAuthSession = {
  userId: string
  email: string
  role: E2EAuthRole
  isActive: boolean
  fullName: string
  state: E2EAuthState
}

type E2ETestUserRecord = E2EAuthSession & {
  password: string
}

type CookieSource = {
  get: (name: string) => { value: string } | undefined
}

declare global {
  var __EVERLUME_E2E_AUTH_USERS__: E2ETestUserRecord[] | undefined
}

export const E2E_AUTH_COOKIE = 'everlume_e2e_auth'

const defaultUsers: E2ETestUserRecord[] = [
  {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'e2e-admin@everlume.local',
    password: 'Everlume123!',
    role: 'admin',
    isActive: true,
    fullName: 'E2E Admin',
    state: 'active',
  },
  {
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'pending-admin@everlume.local',
    password: 'Everlume123!',
    role: 'editor',
    isActive: true,
    fullName: 'Pending Admin',
    state: 'invited',
  },
  {
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'inactive-admin@everlume.local',
    password: 'Everlume123!',
    role: 'admin',
    isActive: false,
    fullName: 'Inactive Admin',
    state: 'deactivated',
  },
]

function cloneUser(user: E2ETestUserRecord): E2ETestUserRecord {
  return { ...user }
}

export function isE2EFakeAuthEnabled() {
  return process.env.E2E_FAKE_AUTH === '1'
}

function getMutableUsers() {
  if (!globalThis.__EVERLUME_E2E_AUTH_USERS__) {
    globalThis.__EVERLUME_E2E_AUTH_USERS__ = defaultUsers.map(cloneUser)
  }

  return globalThis.__EVERLUME_E2E_AUTH_USERS__
}

function sanitizeUser(user: E2ETestUserRecord): E2EAuthSession {
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    fullName: user.fullName,
    state: user.state,
  }
}

function parseSessionCookie(value: string | undefined | null) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<E2EAuthSession>
    if (!parsed.userId || !parsed.email || !parsed.role || typeof parsed.isActive !== 'boolean' || !parsed.fullName || !parsed.state) {
      return null
    }

    return parsed as E2EAuthSession
  } catch {
    return null
  }
}

export async function getE2EAuthSession() {
  const cookieStore = await cookies()
  return parseSessionCookie(cookieStore.get(E2E_AUTH_COOKIE)?.value)
}

export function getE2EAuthSessionFromRequest(request: NextRequest) {
  return parseSessionCookie(request.cookies.get(E2E_AUTH_COOKIE)?.value)
}

export function getE2EAuthSessionFromCookieSource(cookieSource: CookieSource) {
  return parseSessionCookie(cookieSource.get(E2E_AUTH_COOKIE)?.value)
}

export function applyE2EAuthSession(response: NextResponse, session: E2EAuthSession) {
  response.cookies.set(E2E_AUTH_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60,
  })
}

export function clearE2EAuthSession(response: NextResponse) {
  response.cookies.set(E2E_AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  })
}

export function authenticateE2EUser(email: string, password: string) {
  const user = getMutableUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())

  if (!user || user.password !== password) {
    return { ok: false as const, status: 401, message: 'Invalid email or password.' }
  }

  if (!user.isActive || user.state === 'deactivated') {
    return { ok: false as const, status: 403, message: 'This account has been deactivated.' }
  }

  if (user.state === 'invited') {
    return { ok: false as const, status: 403, message: 'This account is still pending password setup.' }
  }

  return { ok: true as const, session: sanitizeUser(user) }
}

export function requestE2EPasswordReset(email: string) {
  const user = getMutableUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())

  return {
    ok: true as const,
    resetPath: user ? `/login/reset-password?email=${encodeURIComponent(user.email)}` : null,
  }
}

export function completeE2EPasswordReset(email: string, password: string) {
  const user = getMutableUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())

  if (!user) {
    return { ok: false as const, status: 404, message: 'Account not found.' }
  }

  if (!user.isActive || user.state === 'deactivated') {
    return { ok: false as const, status: 403, message: 'This account has been deactivated.' }
  }

  user.password = password
  user.state = 'active'

  return { ok: true as const, session: sanitizeUser(user) }
}

export function resetE2EAuthFixtures() {
  globalThis.__EVERLUME_E2E_AUTH_USERS__ = defaultUsers.map(cloneUser)
}
