import { GET } from '@/app/auth/callback/route'

const mockExchangeCodeForSession = vi.fn()
const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  }),
}))

describe('auth callback route', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset()
    mockVerifyOtp.mockReset()
  })

  it('exchanges auth codes and redirects to the requested path', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const res = await GET(
      new Request(
        'https://everlume.test/auth/callback?code=abc123&next=/login/reset-password'
      ) as never
    )

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(res.headers.get('location')).toBe(
      'https://everlume.test/login/reset-password'
    )
  })

  it('verifies recovery otp links', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const res = await GET(
      new Request(
        'https://everlume.test/auth/callback?token_hash=hash123&type=recovery&next=/login/reset-password'
      ) as never
    )

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash123',
      type: 'recovery',
    })
    expect(res.headers.get('location')).toBe(
      'https://everlume.test/login/reset-password'
    )
  })

  it('redirects to login with an error when verification fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Link expired' },
    })

    const res = await GET(
      new Request('https://everlume.test/auth/callback?code=expired') as never
    )

    expect(res.headers.get('location')).toBe(
      'https://everlume.test/login?error=Link%20expired'
    )
  })

  it('falls back to /admin when next is invalid', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const res = await GET(
      new Request(
        'https://everlume.test/auth/callback?code=abc123&next=https://example.com/elsewhere'
      ) as never
    )

    expect(res.headers.get('location')).toBe('https://everlume.test/admin')
  })

  it('redirects to login with a missing-token error when callback params are incomplete', async () => {
    const missingTypeResponse = await GET(
      new Request(
        'https://everlume.test/auth/callback?token_hash=hash123'
      ) as never
    )
    const missingHashResponse = await GET(
      new Request('https://everlume.test/auth/callback?type=recovery') as never
    )
    const missingAllResponse = await GET(
      new Request('https://everlume.test/auth/callback') as never
    )

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(missingTypeResponse.headers.get('location')).toBe(
      'https://everlume.test/login?error=Missing%20auth%20token.'
    )
    expect(missingHashResponse.headers.get('location')).toBe(
      'https://everlume.test/login?error=Missing%20auth%20token.'
    )
    expect(missingAllResponse.headers.get('location')).toBe(
      'https://everlume.test/login?error=Missing%20auth%20token.'
    )
  })

  it('redirects to login with the verify-otp error when otp verification fails', async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { message: 'Recovery link expired' },
    })

    const res = await GET(
      new Request(
        'https://everlume.test/auth/callback?token_hash=hash123&type=recovery&next=/login/reset-password'
      ) as never
    )

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash123',
      type: 'recovery',
    })
    expect(res.headers.get('location')).toBe(
      'https://everlume.test/login?error=Recovery%20link%20expired'
    )
  })
})
