import { checkRateLimit } from '@/lib/server/rate-limit'

describe('rate limit helper', () => {
  const previousBackend = process.env.RATE_LIMIT_BACKEND

  beforeEach(() => {
    process.env.RATE_LIMIT_BACKEND = 'memory'
  })

  afterAll(() => {
    process.env.RATE_LIMIT_BACKEND = previousBackend
  })

  it('allows requests under the limit', async () => {
    const first = await checkRateLimit('test:key:1', 2, 60_000)
    const second = await checkRateLimit('test:key:1', 2, 60_000)

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
  })

  it('blocks requests over the limit', async () => {
    await checkRateLimit('test:key:2', 1, 60_000)
    const blocked = await checkRateLimit('test:key:2', 1, 60_000)

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })
})
