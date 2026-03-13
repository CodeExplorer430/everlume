import { POST } from '@/app/api/auth/e2e-reset-password/route'
import { resetE2EAuthFixtures } from '@/lib/server/e2e-auth'

describe('POST /api/auth/e2e-reset-password', () => {
  beforeEach(() => {
    process.env.E2E_FAKE_AUTH = '1'
    resetE2EAuthFixtures()
  })

  afterEach(() => {
    delete process.env.E2E_FAKE_AUTH
  })

  it('returns not found when fake auth is disabled', async () => {
    delete process.env.E2E_FAKE_AUTH

    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'request',
        email: 'pending-admin@everlume.local',
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
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
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

  it('rejects invalid password reset payloads', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        email: 'pending-admin@everlume.local',
        password: 'short',
      }),
    })

    const res = await POST(req as never)
    await expect(res.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Invalid password reset payload.',
    })
    expect(res.status).toBe(400)
  })

  it('returns a reset path for known e2e users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'request',
        email: 'pending-admin@everlume.local',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(200)
    expect(payload.resetPath).toBe(
      '/login/reset-password?email=pending-admin%40everlume.local'
    )
  })

  it('returns a successful generic response for unknown users without a reset path', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'request',
        email: 'missing-admin@everlume.local',
      }),
    })

    const res = await POST(req as never)
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      message:
        'Password reset instructions have been sent if the account exists.',
      resetPath: null,
    })
  })

  it('completes a password reset and activates the invited account', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        email: 'pending-admin@everlume.local',
        password: 'ChangedPass1!',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const loginReq = new Request(
      'http://localhost/api/auth/e2e-reset-password',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          email: 'inactive-admin@everlume.local',
          password: 'ChangedPass1!',
        }),
      }
    )
    const inactiveRes = await POST(loginReq as never)
    expect(inactiveRes.status).toBe(403)
  })

  it('returns not found when completing reset for a missing account', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        email: 'missing-admin@everlume.local',
        password: 'ChangedPass1!',
      }),
    })

    const res = await POST(req as never)
    await expect(res.json()).resolves.toMatchObject({
      code: 'RESET_ERROR',
      message: 'Account not found.',
    })
    expect(res.status).toBe(404)
  })
})
