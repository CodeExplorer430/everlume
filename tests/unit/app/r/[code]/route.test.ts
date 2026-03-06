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

  it('redirects invalid short codes to fallback page', async () => {
    const req = new NextRequest('http://localhost/r/!!bad')
    const res = await GET(req, { params: Promise.resolve({ code: '!!bad' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/r/not-found')
    expect(res.headers.get('location')).toContain('reason=invalid')
  })

  it('redirects disabled short codes to fallback page', async () => {
    mockSingle.mockResolvedValue({ data: { target_url: 'https://example.com/memorials/a', is_active: false } })

    const req = new NextRequest('http://localhost/r/grandma')
    const res = await GET(req, { params: Promise.resolve({ code: 'grandma' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('reason=disabled')
  })

  it('redirects active short codes to target page', async () => {
    mockSingle.mockResolvedValue({ data: { target_url: 'https://example.com/memorials/a', is_active: true } })

    const req = new NextRequest('http://localhost/r/grandma')
    const res = await GET(req, { params: Promise.resolve({ code: 'grandma' }) })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://example.com/memorials/a')
  })
})
