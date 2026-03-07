import { config } from '@/proxy'

describe('proxy matcher config', () => {
  it('only includes auth-sensitive route groups', () => {
    expect(config.matcher).toEqual([
      '/admin/:path*',
      '/api/admin/:path*',
      '/auth/:path*',
      '/login',
      '/memorials/:path*',
      '/api/public/pages/:path*',
    ])
  })
})
