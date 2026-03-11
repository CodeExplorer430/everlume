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

  it('returns 405 for non-GET/HEAD methods', async () => {
    const response = await worker.fetch(
      new Request('https://go.everlume.app/grandma', { method: 'POST' }),
      env
    )

    expect(response.status).toBe(405)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
