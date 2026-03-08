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

  it('returns a reset path for known e2e users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'request', email: 'pending-admin@everlume.local' }),
    })

    const res = await POST(req as never)
    const payload = await res.json()
    expect(res.status).toBe(200)
    expect(payload.resetPath).toBe('/login/reset-password?email=pending-admin%40everlume.local')
  })

  it('completes a password reset and activates the invited account', async () => {
    const req = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete', email: 'pending-admin@everlume.local', password: 'ChangedPass1!' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const loginReq = new Request('http://localhost/api/auth/e2e-reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete', email: 'inactive-admin@everlume.local', password: 'ChangedPass1!' }),
    })
    const inactiveRes = await POST(loginReq as never)
    expect(inactiveRes.status).toBe(403)
  })
})
