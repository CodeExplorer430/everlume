import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

describe('rate limit helper', () => {
  const previousBackend = process.env.RATE_LIMIT_BACKEND
  const previousBaseUrl = process.env.UPSTASH_REDIS_REST_URL
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.RATE_LIMIT_BACKEND = 'memory'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterAll(() => {
    process.env.RATE_LIMIT_BACKEND = previousBackend
    process.env.UPSTASH_REDIS_REST_URL = previousBaseUrl
    process.env.UPSTASH_REDIS_REST_TOKEN = previousToken
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

  it('resets window for memory backend', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1200).mockReturnValueOnce(2200)

    const first = await checkRateLimit('test:key:3', 1, 500)
    const second = await checkRateLimit('test:key:3', 1, 500)
    const third = await checkRateLimit('test:key:3', 1, 500)

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(false)
    expect(third.allowed).toBe(true)
  })

  it('uses upstash backend when configured', async () => {
    process.env.RATE_LIMIT_BACKEND = 'upstash'
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }]), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }]), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 4000 }]), { status: 200 })
      )

    const result = await checkRateLimit('test:key:upstash', 2, 60_000)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('falls back to memory when upstash call fails', async () => {
    process.env.RATE_LIMIT_BACKEND = 'upstash'
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }))

    const first = await checkRateLimit('test:key:fallback', 1, 60_000)
    const second = await checkRateLimit('test:key:fallback', 1, 60_000)

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(false)
  })
})

describe('getClientIp', () => {
  it('returns unknown when forwarded header is missing', () => {
    expect(getClientIp(null)).toBe('unknown')
  })

  it('extracts first client ip from forwarded list', () => {
    expect(getClientIp('203.0.113.1, 198.51.100.4')).toBe('203.0.113.1')
  })
})
