import { NextRequest } from 'next/server'
import { GET } from '@/app/r/[code]/route'

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

describe('GET /r/[code]', () => {
  beforeEach(() => {
    mockSingle.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects invalid short codes to fallback page', async () => {
    const req = new NextRequest('http://localhost/r/!!bad')
    const res = await GET(req, { params: Promise.resolve({ code: '!!bad' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/r/not-found')
    expect(res.headers.get('location')).toContain('reason=invalid')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('redirects disabled short codes to fallback page', async () => {
    mockSingle.mockResolvedValue({
      data: { target_url: 'https://example.com/memorials/a', is_active: false },
    })

    const req = new NextRequest('http://localhost/r/grandma')
    const res = await GET(req, { params: Promise.resolve({ code: 'grandma' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('reason=disabled')
  })

  it('redirects active short codes to target page', async () => {
    mockSingle.mockResolvedValue({
      data: { target_url: 'https://example.com/memorials/a', is_active: true },
    })

    const req = new NextRequest('http://localhost/r/grandma')
    const res = await GET(req, { params: Promise.resolve({ code: 'grandma' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://example.com/memorials/a')
    expect(res.headers.get('cache-control')).toContain('max-age=60')
    expect(mockEq).toHaveBeenCalledWith('shortcode', 'grandma')
  })

  it('normalizes trimmed short codes and redirects missing database rows to fallback', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const req = new NextRequest('http://localhost/r/Grandma%20')
    const res = await GET(req, {
      params: Promise.resolve({ code: ' Grandma ' }),
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('code=grandma')
    expect(res.headers.get('location')).toContain('reason=missing')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(mockEq).toHaveBeenCalledWith('shortcode', 'grandma')
  })

  it('uses fixture redirects in the e2e public lane and skips the database lookup', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const activeReq = new NextRequest('http://localhost/r/tribute-demo')
    const activeRes = await GET(activeReq, {
      params: Promise.resolve({ code: 'tribute-demo' }),
    })

    expect(activeRes.status).toBe(302)
    expect(activeRes.headers.get('location')).toBe(
      'http://localhost/memorials/e2e-public-memorial'
    )
    expect(mockSingle).not.toHaveBeenCalled()

    const disabledReq = new NextRequest('http://localhost/r/tribute-disabled')
    const disabledRes = await GET(disabledReq, {
      params: Promise.resolve({ code: 'tribute-disabled' }),
    })

    expect(disabledRes.headers.get('location')).toContain('reason=disabled')

    const missingReq = new NextRequest('http://localhost/r/tribute-missing')
    const missingRes = await GET(missingReq, {
      params: Promise.resolve({ code: 'tribute-missing' }),
    })

    expect(missingRes.headers.get('location')).toContain('reason=missing')
    expect(activeRes.headers.get('cache-control')).toContain('max-age=60')
  })
})
