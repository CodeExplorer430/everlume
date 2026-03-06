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
    expect(res.headers.get('set-cookie')).toContain('everlume_page_access_page-1=')
  })
})
