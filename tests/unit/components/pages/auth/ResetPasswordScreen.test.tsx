import { act, fireEvent, render, screen } from '@testing-library/react'
import { ResetPasswordScreen } from '@/components/pages/auth/ResetPasswordScreen'

const mockUpdateUser = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParams = new URLSearchParams()
const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}))

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    vi.useRealTimers()
    delete process.env.NEXT_PUBLIC_E2E_FAKE_AUTH
    mockUpdateUser.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSearchParams.delete('email')
    fetchMock.mockReset()
  })

  it('updates the password and redirects to login', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })

  it('blocks submission when passwords do not match', async () => {
    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'different' },
    })

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /update password/i })
    ).toBeDisabled()
  })

  it('shows the submit mismatch error when the form is submitted directly', async () => {
    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'different' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: /update password/i }).closest('form')!
    )

    expect(await screen.findAllByText('Passwords do not match.')).toHaveLength(
      2
    )
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('uses fake auth password reset flow when enabled', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    mockSearchParams.set('email', 'pending-admin@everlume.local')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/e2e-reset-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })

  it('shows the saving state and redirects after fake auth password reset succeeds', async () => {
    vi.useFakeTimers()
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    mockSearchParams.set('email', 'pending-admin@everlume.local')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
      })
    )

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(
      screen.getByRole('button', { name: /saving password/i })
    ).toBeDisabled()

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText(/password updated/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    expect(mockPush).toHaveBeenCalledWith('/login?reset=success')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows the incomplete reset-link warning and disables submission in fake auth mode without email', () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'

    render(<ResetPasswordScreen />)

    expect(
      screen.getByText(
        'Reset link is incomplete. Start from the forgot-password screen.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /update password/i })
    ).toBeDisabled()
  })

  it('shows the returned auth error when supabase password update fails', async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: 'Password update failed.' },
    })

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(
      await screen.findByText('Password update failed.')
    ).toBeInTheDocument()
  })

  it('shows the fake auth api error when reset completion fails', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    mockSearchParams.set('email', 'pending-admin@everlume.local')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Reset token expired.' }), {
        status: 400,
      })
    )

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText('Reset token expired.')).toBeInTheDocument()
  })

  it('falls back to the default fake auth error when the response is not json', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    mockSearchParams.set('email', 'pending-admin@everlume.local')
    fetchMock.mockResolvedValue(new Response('bad gateway', { status: 502 }))

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'ChangedPass1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(
      await screen.findByText('Unable to update password.')
    ).toBeInTheDocument()
  })

  it('shows the saving state while the password update is pending', async () => {
    let resolveUpdate: ((value: { error: null }) => void) | undefined

    mockUpdateUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve
      })
    )

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(
      screen.getByRole('button', { name: /saving password/i })
    ).toBeDisabled()

    resolveUpdate?.({ error: null })

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
