import { GET } from '@/app/auth/callback/route'

const mockExchangeCodeForSession = vi.fn()
const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
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

    const res = await GET(new Request('https://everlume.test/auth/callback?code=abc123&next=/login/reset-password') as never)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(res.headers.get('location')).toBe('https://everlume.test/login/reset-password')
  })

  it('verifies recovery otp links', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const res = await GET(
      new Request('https://everlume.test/auth/callback?token_hash=hash123&type=recovery&next=/login/reset-password') as never
    )

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'hash123', type: 'recovery' })
    expect(res.headers.get('location')).toBe('https://everlume.test/login/reset-password')
  })

  it('redirects to login with an error when verification fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'Link expired' } })

    const res = await GET(new Request('https://everlume.test/auth/callback?code=expired') as never)

    expect(res.headers.get('location')).toBe('https://everlume.test/login?error=Link%20expired')
  })
})
