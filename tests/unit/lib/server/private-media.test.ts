import {
  createSignedMediaToken,
  verifySignedMediaToken,
} from '@/lib/server/private-media'
import { createHmac } from 'crypto'

describe('private media tokens', () => {
  const previous = process.env.PRIVATE_MEDIA_TOKEN_SECRET

  beforeEach(() => {
    process.env.PRIVATE_MEDIA_TOKEN_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.PRIVATE_MEDIA_TOKEN_SECRET = previous
  })

  it('creates and verifies a valid token', () => {
    const token = createSignedMediaToken('photo-1', 'image', 60)
    expect(verifySignedMediaToken(token, 'photo-1', 'image')).toBe(true)
  })

  it('rejects mismatched variant', () => {
    const token = createSignedMediaToken('photo-1', 'image', 60)
    expect(verifySignedMediaToken(token, 'photo-1', 'thumb')).toBe(false)
  })

  it('rejects expired token', () => {
    const token = createSignedMediaToken('photo-1', 'image', -10)
    expect(verifySignedMediaToken(token, 'photo-1', 'image')).toBe(false)
  })

  it('rejects malformed tokens and mismatched photo ids', () => {
    const encodedPayload = Buffer.from('not-json').toString('base64url')
    const signature = createHmac('sha256', 'test-secret')
      .update(encodedPayload)
      .digest('base64url')

    expect(verifySignedMediaToken(null, 'photo-1', 'image')).toBe(false)
    expect(verifySignedMediaToken('bad-token', 'photo-1', 'image')).toBe(false)
    expect(
      verifySignedMediaToken(
        `${encodedPayload}.${signature}`,
        'photo-1',
        'image'
      )
    ).toBe(false)

    const token = createSignedMediaToken('photo-1', 'thumb', 60)
    expect(verifySignedMediaToken(token, 'photo-2', 'thumb')).toBe(false)
  })

  it('rejects tokens with missing payload or signature segments', () => {
    expect(verifySignedMediaToken('.signature', 'photo-1', 'image')).toBe(false)
    expect(verifySignedMediaToken('payload.', 'photo-1', 'image')).toBe(false)
  })

  it('rejects tokens when the signature length does not match', () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({
        photoId: 'photo-1',
        variant: 'image',
        exp: Math.floor(Date.now() / 1000) + 60,
      })
    ).toString('base64url')

    expect(
      verifySignedMediaToken(`${encodedPayload}.short`, 'photo-1', 'image')
    ).toBe(false)
  })

  it('throws when the private media signing secret is missing', () => {
    delete process.env.PRIVATE_MEDIA_TOKEN_SECRET

    expect(() => createSignedMediaToken('photo-1', 'image', 60)).toThrow(
      'PRIVATE_MEDIA_TOKEN_SECRET is required for private media URLs.'
    )
  })
})
