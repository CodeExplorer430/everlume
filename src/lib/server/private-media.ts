import { createHmac, timingSafeEqual } from 'crypto'

const DEFAULT_TTL_SECONDS = 300

type SignedMediaTokenPayload = {
  photoId: string
  variant: 'image' | 'thumb'
  exp: number
}

function getSigningSecret() {
  const secret = process.env.PRIVATE_MEDIA_TOKEN_SECRET
  if (!secret) {
    throw new Error('PRIVATE_MEDIA_TOKEN_SECRET is required for private media URLs.')
  }
  return secret
}

function signPayload(payload: string) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

export function createSignedMediaToken(photoId: string, variant: 'image' | 'thumb', ttlSeconds = DEFAULT_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload: SignedMediaTokenPayload = { photoId, variant, exp }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifySignedMediaToken(token: string | null, photoId: string, variant: 'image' | 'thumb') {
  if (!token || !token.includes('.')) return false

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return false

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const actualBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return false
  }

  let parsed: SignedMediaTokenPayload
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SignedMediaTokenPayload
  } catch {
    return false
  }

  if (parsed.photoId !== photoId || parsed.variant !== variant) return false
  return parsed.exp > Math.floor(Date.now() / 1000)
}
