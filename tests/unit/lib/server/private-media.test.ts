import { createSignedMediaToken, verifySignedMediaToken } from '@/lib/server/private-media'

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
})
