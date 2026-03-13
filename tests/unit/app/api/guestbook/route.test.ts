import { POST } from '@/app/api/guestbook/route'

const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const fetchMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'pages') {
        return { select: mockSelect }
      }
      return { insert: mockInsert }
    },
  }),
}))

describe('POST /api/guestbook', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubGlobal('fetch', fetchMock)
    mockSingle.mockReset()
    mockInsert.mockReset()
    mockSelect.mockClear()
    mockEq.mockClear()
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns invalid json when the request body cannot be parsed', async () => {
    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(400)
    expect(payload).toEqual({
      code: 'INVALID_JSON',
      message: 'Invalid request payload.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects invalid payload', async () => {
    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memorialId: 'bad-id', name: '', message: '' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('short-circuits honeypot submissions as accepted spam', async () => {
    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        honeypot: 'bot-filled',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(202)
    expect(payload).toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns too-fast when the submission delay threshold is not met', async () => {
    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 500,
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(429)
    expect(payload).toEqual({
      code: 'TOO_FAST',
      message: 'Please wait a moment before submitting your message.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates guestbook entry for valid payload', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith({
      page_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Maria',
      message: 'Forever remembered',
    })
  })

  it('returns 503 in production when strict security config is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_BACKEND', 'memory')
    vi.stubEnv('CAPTCHA_ENABLED', '0')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
  })

  it('returns 503 in production when turnstile site key is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_BACKEND', 'upstash')
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
  })

  it('returns 503 in production when the turnstile site key is only whitespace', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_BACKEND', 'upstash')
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '   ')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
  })

  it('returns captcha failure when captcha is enabled and token is missing', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(400)
    expect(payload.code).toBe('CAPTCHA_FAILED')
    expect(payload.message).toBe(
      'Please complete the captcha check before posting.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns captcha failure when captcha verification returns success false', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    )

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'bad-token',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(400)
    expect(payload.code).toBe('CAPTCHA_FAILED')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns captcha failure when captcha verification upstream errors', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(new Response('unavailable', { status: 500 }))

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'maybe-valid',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(400)
    expect(payload.code).toBe('CAPTCHA_FAILED')
    expect(payload.message).toBe(
      'Spam protection is temporarily unavailable. Please try again shortly.'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns captcha failure when captcha verification cannot reach the upstream service', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockRejectedValue(new Error('network down'))

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'maybe-valid',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(400)
    expect(payload.code).toBe('CAPTCHA_FAILED')
    expect(payload.message).toBe(
      'Spam protection is temporarily unavailable. Please try again shortly.'
    )
  })

  it('returns 503 in production when captcha protection is enabled but the secret is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_BACKEND', 'upstash')
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', '')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(503)
  })

  it('allows production requests to continue when durable rate limiting and captcha are fully configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_BACKEND', 'upstash')
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key')

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: 'INVALID_JSON',
    })
  })

  it('uses the custom captcha verify url when configured', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    vi.stubEnv('CAPTCHA_VERIFY_URL', 'https://captcha.example.test/verify')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'good-token',
      }),
    })

    const res = await POST(req as never)

    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://captcha.example.test/verify',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns captcha failure when captcha verification returns invalid json', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(new Response('bad json', { status: 200 }))

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'maybe-valid',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(400)
    expect(payload).toEqual({
      code: 'CAPTCHA_FAILED',
      message:
        'Spam protection is temporarily unavailable. Please try again shortly.',
    })
  })

  it('returns rate limited when too many messages are submitted for the same memorial and ip', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const makeRequest = () =>
      POST(
        new Request('http://localhost/api/guestbook', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '198.51.100.10',
          },
          body: JSON.stringify({
            memorialId: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Maria',
            message: 'Forever remembered',
            submittedAt: Date.now() - 3000,
          }),
        }) as never
      )

    for (let index = 0; index < 5; index += 1) {
      const res = await makeRequest()
      expect(res.status).toBe(201)
    }

    const blocked = await makeRequest()
    const payload = await blocked.json()

    expect(blocked.status).toBe(429)
    expect(payload).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again in a minute.',
    })
  })

  it('returns not found when the memorial cannot be loaded', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(404)
    expect(payload).toEqual({
      code: 'MEMORIAL_NOT_FOUND',
      message: 'Memorial not found.',
    })
  })

  it('returns a database error when guestbook insert fails', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.11',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(500)
    expect(payload).toEqual({
      code: 'DATABASE_ERROR',
      message: 'Unable to submit your message right now.',
    })
  })

  it('creates guestbook entry when captcha verification succeeds', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({
        memorialId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'good-token',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockInsert).toHaveBeenCalled()
  })
})
