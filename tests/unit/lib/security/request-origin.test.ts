import { validateAdminMutationOrigin } from '@/lib/security/request-origin'

describe('validateAdminMutationOrigin', () => {
  const requestUrl = 'https://app.everlume.test/api/admin/site-settings'

  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.everlume.test'
  })

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
      return
    }

    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('allows requests with no browser origin metadata', () => {
    const request = new Request(requestUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })

    expect(validateAdminMutationOrigin(request)).toBeNull()
  })

  it('allows same-origin origin headers', async () => {
    const request = new Request(requestUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        origin: 'https://app.everlume.test',
      },
      body: JSON.stringify({ ok: true }),
    })

    expect(validateAdminMutationOrigin(request)).toBeNull()
  })

  it('allows same-origin referer headers when origin is absent', () => {
    const request = new Request(requestUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        referer: 'https://app.everlume.test/admin/settings',
      },
      body: JSON.stringify({ ok: true }),
    })

    expect(validateAdminMutationOrigin(request)).toBeNull()
  })

  it('rejects invalid origin header values', async () => {
    const request = new Request(requestUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        origin: 'not-a-url',
      },
      body: JSON.stringify({ ok: true }),
    })

    const response = validateAdminMutationOrigin(request)

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({
      code: 'FORBIDDEN',
      message: 'Cross-origin admin requests are not allowed.',
    })
  })

  it('rejects requests with an invalid request url', async () => {
    const request = {
      url: 'not-a-url',
      headers: new Headers({
        origin: 'https://app.everlume.test',
      }),
    } as unknown as Request

    const response = validateAdminMutationOrigin(request)

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({
      code: 'FORBIDDEN',
      message: 'Cross-origin admin requests are not allowed.',
    })
  })

  it('rejects requests with an empty request url', async () => {
    const request = {
      url: '',
      headers: new Headers({
        origin: 'https://app.everlume.test',
      }),
    } as unknown as Request

    const response = validateAdminMutationOrigin(request)

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({
      code: 'FORBIDDEN',
      message: 'Cross-origin admin requests are not allowed.',
    })
  })

  it('rejects cross-origin requests', async () => {
    const request = new Request(requestUrl, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
      body: JSON.stringify({ ok: true }),
    })

    const response = validateAdminMutationOrigin(request)

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({
      code: 'FORBIDDEN',
      message: 'Cross-origin admin requests are not allowed.',
    })
  })
})
