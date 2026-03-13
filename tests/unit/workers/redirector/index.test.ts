import worker from '../../../../workers/redirector/src/index'

type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  FALLBACK_URL?: string
}

const env: Env = {
  SUPABASE_URL: 'https://supabase.example.com',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  FALLBACK_URL: 'https://everlume.app',
}

describe('redirector worker', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects when shortcode exists and is active', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            target_url: 'https://everlume.app/memorials/jane',
            is_active: true,
          },
        ]),
        { status: 200 }
      )
    )

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      env
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://everlume.app/memorials/jane'
    )
  })

  it('supports /r/ prefixed paths and uses SUPABASE_SECRET_KEY when provided', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            target_url: 'https://everlume.app/memorials/jane',
            is_active: true,
          },
        ]),
        { status: 200 }
      )
    )

    const response = await worker.fetch(
      new Request('https://go.everlume.app/r/grandma'),
      {
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_SECRET_KEY: 'secret-key',
        FALLBACK_URL: env.FALLBACK_URL,
      }
    )

    expect(response.status).toBe(302)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('shortcode=eq.grandma'),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'secret-key',
          Authorization: 'Bearer secret-key',
        }),
      })
    )
  })

  it('returns 404 when shortcode is inactive', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            target_url: 'https://everlume.app/memorials/jane',
            is_active: false,
          },
        ]),
        { status: 200 }
      )
    )

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      env
    )

    expect(response.status).toBe(404)
  })

  it('returns 404 when shortcode is missing', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    )

    const response = await worker.fetch(
      new Request('https://go.everlume.app/missing'),
      env
    )

    expect(response.status).toBe(404)
  })

  it('returns 404 when the upstream redirect lookup is non-ok', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      env
    )

    expect(response.status).toBe(404)
  })

  it('redirects root path to fallback when configured', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/'),
      env
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://everlume.app/')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 for root path when fallback is not configured', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/'),
      { ...env, FALLBACK_URL: undefined }
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows HEAD methods for short-link checks', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            target_url: 'https://everlume.app/memorials/jane',
            is_active: true,
          },
        ]),
        { status: 200 }
      )
    )

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma', { method: 'HEAD' }),
      env
    )

    expect(response.status).toBe(302)
  })

  it('returns 404 for root path when fallback is invalid', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/'),
      { ...env, FALLBACK_URL: 'not-a-url' }
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when a sanitized /r/ path has no shortcode', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/r/'),
      env
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 405 for non-GET/HEAD methods', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma', { method: 'POST' }),
      env
    )

    expect(response.status).toBe(405)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when worker supabase url is invalid', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      { ...env, SUPABASE_URL: 'not-a-url' }
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when worker api key is missing', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      { SUPABASE_URL: env.SUPABASE_URL }
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when upstream fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      env
    )

    expect(response.status).toBe(404)
  })

  it('returns 404 when upstream returns invalid json', async () => {
    fetchMock.mockResolvedValue(new Response('not-json', { status: 200 }))

    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma'),
      env
    )

    expect(response.status).toBe(404)
  })
})
