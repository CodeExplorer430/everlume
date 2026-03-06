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

  it('rejects invalid payload', async () => {
    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId: 'bad-id', name: '', message: '' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('creates guestbook entry for valid payload', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
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
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
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
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(400)
    expect(payload.code).toBe('CAPTCHA_FAILED')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns captcha failure when captcha verification returns success false', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }))

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
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
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
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
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates guestbook entry when captcha verification succeeds', async () => {
    vi.stubEnv('CAPTCHA_ENABLED', '1')
    vi.stubEnv('CAPTCHA_SECRET', 'test-secret')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    mockSingle.mockResolvedValue({ data: { id: 'page-1' } })
    mockInsert.mockResolvedValue({ error: null })

    const req = new Request('http://localhost/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria',
        message: 'Forever remembered',
        submittedAt: Date.now() - 3000,
        captchaToken: 'good-token',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalled()
  })
})
