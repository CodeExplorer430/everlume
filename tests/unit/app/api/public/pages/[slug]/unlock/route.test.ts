import { POST } from '@/app/api/public/pages/[slug]/unlock/route'
import { hashPagePassword } from '@/lib/server/page-password'

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

describe('POST /api/public/pages/[slug]/unlock', () => {
  beforeEach(() => {
    mockSingle.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 for invalid password', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        access_mode: 'password',
        password_hash: hashPagePassword('correct-password'),
        password_updated_at: '2026-03-06T00:00:00.000Z',
      },
    })

    const req = new Request('http://localhost/api/public/pages/jane/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets cookie for valid password', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'page-1',
        slug: 'jane',
        access_mode: 'password',
        password_hash: hashPagePassword('correct-password'),
        password_updated_at: '2026-03-06T00:00:00.000Z',
      },
    })

    const req = new Request('http://localhost/api/public/pages/jane/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'correct-password' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({ slug: 'jane' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('everlume_memorial_access_page-1=')
    expect(res.headers.get('set-cookie')).toContain('Path=/')
  })

  it('unlocks password memorial fixtures when the e2e public lane is enabled', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const req = new Request('http://localhost/api/public/pages/e2e-password-memorial/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'EverlumeMemory!' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({ slug: 'e2e-password-memorial' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('everlume_memorial_access_12222222-2222-2222-2222-222222222222=')
    expect(res.headers.get('set-cookie')).toContain('Path=/')
  })

  it('rejects invalid passwords for password memorial fixtures', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const req = new Request('http://localhost/api/public/pages/e2e-password-memorial/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'incorrect-password' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({ slug: 'e2e-password-memorial' }) })

    expect(res.status).toBe(401)
  })
})
