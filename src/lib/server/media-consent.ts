import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { type MemorialAccessMode } from '@/lib/server/memorials'

const COOKIE_VERSION = 'v1'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

export type MediaConsentEventType = 'consent_granted' | 'media_accessed'
export type MediaConsentKind = 'gallery_image' | 'gallery_thumb'

type MediaConsentRecordInput = {
  request: NextRequest
  memorialId: string
  accessMode: MemorialAccessMode
  consentVersion: number
  eventType: MediaConsentEventType
  mediaKind?: MediaConsentKind | null
  mediaVariant?: 'image' | 'thumb' | null
  photoId?: string | null
}

type MediaConsentTokenInput = {
  memorialId: string
  passwordUpdatedAt: string | null
  consentVersion: number
  consentRevokedAt: string | null
}

function getConsentSecret() {
  return process.env.PAGE_ACCESS_TOKEN_SECRET || process.env.PRIVATE_MEDIA_TOKEN_SECRET || 'dev-page-access-secret'
}

function signPayload(payload: string) {
  return createHmac('sha256', getConsentSecret()).update(payload).digest('base64url')
}

function getVisitorIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

function hashVisitorValue(value: string) {
  return createHmac('sha256', getConsentSecret()).update(value).digest('base64url')
}

export function createMemorialMediaConsentToken({
  memorialId,
  passwordUpdatedAt,
  consentVersion,
  consentRevokedAt,
}: MediaConsentTokenInput) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const passwordVersion = Buffer.from(passwordUpdatedAt || 'unset').toString('base64url')
  const consentRevocationVersion = Buffer.from(consentRevokedAt || 'unset').toString('base64url')
  const payload = `${COOKIE_VERSION}.${memorialId}.${issuedAt}.${passwordVersion}.${consentVersion}.${consentRevocationVersion}`
  return `${payload}.${signPayload(payload)}`
}

export function verifyMemorialMediaConsentToken(
  token: string | undefined,
  memorialId: string,
  passwordUpdatedAt: string | null,
  consentVersion: number,
  consentRevokedAt: string | null
) {
  if (!token) return false

  const segments = token.split('.')
  if (segments.length !== 7) return false

  const [version, tokenMemorialId, issuedAtString, passwordVersionEncoded, tokenConsentVersionString, consentRevocationVersionEncoded, signature] = segments
  if (version !== COOKIE_VERSION || tokenMemorialId !== memorialId) return false

  const issuedAt = Number(issuedAtString)
  if (!Number.isFinite(issuedAt)) return false

  const now = Math.floor(Date.now() / 1000)
  if (issuedAt > now || now - issuedAt > COOKIE_MAX_AGE_SECONDS) return false

  const expectedPasswordVersion = passwordUpdatedAt || 'unset'
  const tokenPasswordVersion = Buffer.from(passwordVersionEncoded, 'base64url').toString('utf8')
  if (tokenPasswordVersion !== expectedPasswordVersion) return false

  const tokenConsentVersion = Number(tokenConsentVersionString)
  if (!Number.isFinite(tokenConsentVersion) || tokenConsentVersion !== consentVersion) return false

  const expectedConsentRevocationVersion = consentRevokedAt || 'unset'
  const tokenConsentRevocationVersion = Buffer.from(consentRevocationVersionEncoded, 'base64url').toString('utf8')
  if (tokenConsentRevocationVersion !== expectedConsentRevocationVersion) return false

  const payload = `${version}.${tokenMemorialId}.${issuedAtString}.${passwordVersionEncoded}.${tokenConsentVersionString}.${consentRevocationVersionEncoded}`
  const expectedSignature = signPayload(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function getMemorialMediaConsentCookieName(memorialId: string) {
  return `everlume_memorial_media_consent_${memorialId}`
}

export function getMemorialMediaConsentCookieMaxAge() {
  return COOKIE_MAX_AGE_SECONDS
}

export function buildMemorialMediaConsentRecord({
  request,
  memorialId,
  accessMode,
  consentVersion,
  eventType,
  mediaKind = null,
  mediaVariant = null,
  photoId = null,
}: MediaConsentRecordInput) {
  return {
    page_id: memorialId,
    photo_id: photoId,
    access_mode: accessMode,
    consent_version: consentVersion,
    event_type: eventType,
    consent_source: 'protected_media_gate',
    media_kind: mediaKind,
    media_variant: mediaVariant,
    ip_hash: hashVisitorValue(getVisitorIp(request)),
    user_agent_hash: hashVisitorValue(request.headers.get('user-agent') || 'unknown'),
  }
}

export async function insertMemorialMediaConsent(input: MediaConsentRecordInput) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('media_access_consents').insert(buildMemorialMediaConsentRecord(input))

  if (error) {
    throw new Error(error.message || 'Unable to record media consent.')
  }
}

export async function tryInsertMemorialMediaAccess(input: MediaConsentRecordInput) {
  try {
    await insertMemorialMediaConsent(input)
  } catch (error) {
    console.error('Protected media access logging failed.', error)
  }
}
