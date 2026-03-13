import { config, proxy } from '@/proxy'

const mockUpdateSession = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

describe('proxy matcher config', () => {
  beforeEach(() => {
    mockUpdateSession.mockReset()
  })

  it('only includes auth-sensitive route groups', () => {
    expect(config.matcher).toEqual([
      '/admin/:path*',
      '/api/admin/:path*',
      '/auth/:path*',
      '/login',
      '/memorials/:path*',
      '/api/public/memorials/:path*',
    ])
  })

  it('delegates proxy requests to the Supabase session updater', async () => {
    const request = { nextUrl: { pathname: '/admin' } } as never
    const response = { ok: true }
    mockUpdateSession.mockResolvedValue(response)

    await expect(proxy(request)).resolves.toBe(response)
    expect(mockUpdateSession).toHaveBeenCalledWith(request)
  })
})
