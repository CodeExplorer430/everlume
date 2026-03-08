import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordScreen } from '@/components/pages/auth/ForgotPasswordScreen'

const mockResetPasswordForEmail = vi.fn()
const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
    },
  }),
}))

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_E2E_FAKE_AUTH
    mockResetPasswordForEmail.mockReset()
    fetchMock.mockReset()
  })

  it('submits a password reset request', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<ForgotPasswordScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.click(screen.getByRole('button', { name: /send password reset/i }))

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'admin@example.com',
      expect.objectContaining({ redirectTo: expect.stringMatching(/\/auth\/callback\?next=\/login\/reset-password$/) })
    )
    expect(await screen.findByText(/password reset instructions have been sent/i)).toBeInTheDocument()
  })

  it('shows reset request error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Reset failed' } })

    const user = userEvent.setup()
    render(<ForgotPasswordScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.click(screen.getByRole('button', { name: /send password reset/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reset failed')
  })

  it('shows a reset continuation link in fake auth mode', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Password reset instructions have been sent if the account exists.',
          resetPath: '/login/reset-password?email=pending-admin%40everlume.local',
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<ForgotPasswordScreen />)

    await user.type(screen.getByLabelText('Email'), 'pending-admin@everlume.local')
    await user.click(screen.getByRole('button', { name: /send password reset/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/e2e-reset-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByRole('link', { name: /continue to password reset/i })).toHaveAttribute(
      'href',
      '/login/reset-password?email=pending-admin%40everlume.local'
    )
  })
})
