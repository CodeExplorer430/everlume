import { getAppBaseUrl } from '@/lib/site-url'

describe('site url helper', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    delete process.env.VERCEL_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('prefers explicit NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://everlume.app'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'everlume.vercel.app'

    expect(getAppBaseUrl().toString()).toBe('https://everlume.app/')
  })

  it('falls back to the production Vercel hostname', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'everlume.vercel.app'

    expect(getAppBaseUrl().toString()).toBe('https://everlume.vercel.app/')
  })

  it('ignores invalid explicit app urls and falls back to the next valid source', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://[invalid'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'everlume.vercel.app'

    expect(getAppBaseUrl().toString()).toBe('https://everlume.vercel.app/')
  })

  it('falls back to the preview Vercel hostname before localhost', () => {
    process.env.VERCEL_URL = 'preview-everlume.vercel.app'

    expect(getAppBaseUrl().toString()).toBe(
      'https://preview-everlume.vercel.app/'
    )
  })

  it('uses localhost as the final fallback', () => {
    expect(getAppBaseUrl().toString()).toBe('http://localhost:3000/')
  })
})
