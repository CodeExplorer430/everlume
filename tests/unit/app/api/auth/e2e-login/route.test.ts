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

  it('authenticates an active e2e user and sets a session cookie', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-admin@everlume.local', password: 'Everlume123!' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(res.cookies.get('everlume_e2e_auth')?.value).toContain('e2e-admin@everlume.local')
  })

  it('rejects deactivated users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'inactive-admin@everlume.local', password: 'Everlume123!' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })

  it('rejects pending invited users', async () => {
    const req = new Request('http://localhost/api/auth/e2e-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'pending-admin@everlume.local', password: 'Everlume123!' }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })
})
