import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'

const PBKDF2_ITERATIONS = 120_000
const KEY_LENGTH = 32
const DIGEST = 'sha256'
const HASH_PREFIX = 'pbkdf2'
const COOKIE_VERSION = 'v1'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

function getAccessSecret() {
  return process.env.PAGE_ACCESS_TOKEN_SECRET || process.env.PRIVATE_MEDIA_TOKEN_SECRET || 'dev-page-access-secret'
}

export function hashMemorialPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${HASH_PREFIX}$${PBKDF2_ITERATIONS}$${salt}$${hash}`
}

export function verifyMemorialPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false
  const [prefix, iterString, salt, expected] = storedHash.split('$')
  if (prefix !== HASH_PREFIX || !iterString || !salt || !expected) return false
  const iterations = Number(iterString)
  if (!Number.isFinite(iterations) || iterations <= 0) return false

  const actual = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (actual.length !== expectedBuffer.length) return false

  return timingSafeEqual(actual, expectedBuffer)
}

export function createMemorialAccessToken(memorialId: string, passwordUpdatedAt: string | null) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const passwordVersion = passwordUpdatedAt || 'unset'
  const payload = `${COOKIE_VERSION}.${memorialId}.${issuedAt}.${Buffer.from(passwordVersion).toString('base64url')}`
  const signature = createHmac('sha256', getAccessSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyMemorialAccessToken(token: string | undefined, memorialId: string, passwordUpdatedAt: string | null) {
  if (!token) return false
  const segments = token.split('.')
  if (segments.length !== 5) return false

  const [version, tokenMemorialId, issuedAtString, passwordVersionEncoded, signature] = segments
  if (version !== COOKIE_VERSION || tokenMemorialId !== memorialId) return false

  const issuedAt = Number(issuedAtString)
  if (!Number.isFinite(issuedAt)) return false

  const now = Math.floor(Date.now() / 1000)
  if (issuedAt > now || now - issuedAt > COOKIE_MAX_AGE_SECONDS) return false

  const expectedPasswordVersion = passwordUpdatedAt || 'unset'
  const tokenPasswordVersion = Buffer.from(passwordVersionEncoded, 'base64url').toString('utf8')
  if (tokenPasswordVersion !== expectedPasswordVersion) return false

  const payload = `${version}.${tokenMemorialId}.${issuedAtString}.${passwordVersionEncoded}`
  const expectedSignature = createHmac('sha256', getAccessSecret()).update(payload).digest('base64url')

  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (actualBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function getMemorialAccessCookieName(memorialId: string) {
  return `everlume_memorial_access_${memorialId}`
}

export function getMemorialAccessCookieMaxAge() {
  return COOKIE_MAX_AGE_SECONDS
}

export const hashPagePassword = hashMemorialPassword
export const verifyPagePassword = verifyMemorialPassword
export const createPageAccessToken = createMemorialAccessToken
export const verifyPageAccessToken = verifyMemorialAccessToken
export const getPageAccessCookieName = getMemorialAccessCookieName
export const getPageAccessCookieMaxAge = getMemorialAccessCookieMaxAge
