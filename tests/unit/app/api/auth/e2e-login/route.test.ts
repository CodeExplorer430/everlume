import { POST } from '@/app/api/auth/e2e-login/route'
import { resetE2EAuthFixtures } from '@/lib/server/e2e-auth'

describe('POST /api/auth/e2e-login', () => {
  beforeEach(() => {
    process.env.E2E_FAKE_AUTH = '1'
    resetE2EAuthFixtures()
  })

  afterEach(() => {
    delete process.env.E2E_FAKE_AUTH
  })

  it('returns not found when fake auth is disabled', async () => {
    delete process.env.E2E_FAKE_AUTH

    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-admin@everlume.local',
        password: 'Everlume123!',
      }),
    })

    const res = await POST(req as never)
    await expect(res.json()).resolves.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Not found.',
    })
    expect(res.status).toBe(404)
  })

  it('rejects invalid json payloads', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    })

    const res = await POST(req as never)
    await expect(res.json()).resolves.toMatchObject({
      code: 'INVALID_JSON',
    })
    expect(res.status).toBe(400)
  })

  it('rejects invalid credentials payloads before authentication', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: '',
      }),
    })

    const res = await POST(req as never)
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Enter a valid email and password.',
    })
    expect(res.status).toBe(400)
  })

  it('authenticates an active e2e user and sets a session cookie', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-admin@everlume.local',
        password: 'Everlume123!',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(res.cookies.get('everlume_e2e_auth')?.value).toContain(
      'e2e-admin@everlume.local'
    )
  })

  it('rejects deactivated users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'inactive-admin@everlume.local',
        password: 'Everlume123!',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })

  it('rejects pending invited users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'pending-admin@everlume.local',
        password: 'Everlume123!',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })

  it('rejects invalid passwords and clears any existing fake-auth cookie', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie:
          'everlume_e2e_auth=%7B%22email%22%3A%22stale%40everlume.local%22%7D',
      },
      body: JSON.stringify({
        email: 'e2e-admin@everlume.local',
        password: 'wrong-password',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(401)
    expect(payload).toMatchObject({
      code: 'AUTH_ERROR',
      message: 'Invalid email or password.',
    })
    expect(res.headers.get('set-cookie')).toContain('everlume_e2e_auth=')
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
