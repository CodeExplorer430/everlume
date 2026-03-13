import {
  buildContentSecurityPolicy,
  getSecurityHeaders,
} from '@/lib/security/http-headers'

describe('security headers', () => {
  it('builds a CSP with required third-party allowlists and env-derived origins', () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://app.everlume.test',
      NEXT_PUBLIC_SHORT_DOMAIN: 'https://go.everlume.test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      VIDEO_TRANSCODE_API_BASE: 'https://transcode.everlume.test',
      VIDEO_TRANSCODE_APP_BASE: 'https://app.everlume.test',
    })

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('connect-src')
    expect(csp).toContain('https://app.everlume.test')
    expect(csp).toContain('https://go.everlume.test')
    expect(csp).toContain('https://demo.supabase.co')
    expect(csp).toContain('https://transcode.everlume.test')
    expect(csp).toContain('https://widget.cloudinary.com')
    expect(csp).toContain('https://challenges.cloudflare.com')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('adds the minimum webpack-dev allowances outside production', () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: 'development',
    })

    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain('http://127.0.0.1:4173')
    expect(csp).toContain('ws:')
  })

  it('ignores invalid env origins when building the CSP', () => {
    const csp = buildContentSecurityPolicy({
      NEXT_PUBLIC_APP_URL: 'not-a-url',
      NEXT_PUBLIC_SHORT_DOMAIN: 'https://go.everlume.test',
    })

    expect(csp).not.toContain('not-a-url')
    expect(csp).toContain('https://go.everlume.test')
  })

  it('returns the full hardened header set', () => {
    const headers = Object.fromEntries(
      getSecurityHeaders().map(({ key, value }) => [key, value])
    )

    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
  })
})
