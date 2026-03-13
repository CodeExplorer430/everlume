import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginScreen } from '@/components/pages/auth/LoginScreen'

function deferredResult<T>() {
  let resolve: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

const mockSignInWithPassword = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParams = new URLSearchParams()
const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
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

describe('LoginScreen', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_E2E_FAKE_AUTH
    mockSignInWithPassword.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
    fetchMock.mockReset()
    mockSearchParams.delete('error')
    mockSearchParams.delete('reset')
  })

  it('signs in and navigates to admin on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in to admin/i }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(mockPush).toHaveBeenCalledWith('/admin')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows auth error on failed sign in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in to admin/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid login credentials'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders password reset success banner from query params', () => {
    mockSearchParams.set('reset', 'success')

    render(<LoginScreen />)

    expect(
      screen.getByText('Password updated. Sign in with your new password.')
    ).toBeInTheDocument()
  })

  it('renders the decoded error banner from query params', () => {
    mockSearchParams.set('error', encodeURIComponent('Session expired'))

    render(<LoginScreen />)

    expect(screen.getByText('Session expired')).toBeInTheDocument()
  })

  it('uses the fake auth route when e2e fake auth is enabled', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'e2e-admin@everlume.local')
    await user.type(screen.getByLabelText('Password'), 'Everlume123!')
    await user.click(screen.getByRole('button', { name: /sign in to admin/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/e2e-login',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/admin')
  })

  it('shows the fallback fake-auth error when the API response is not json', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    fetchMock.mockResolvedValue(new Response('bad', { status: 500 }))

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in to admin/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in.'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the loading state while sign-in is pending', async () => {
    const request = deferredResult<{ error: null }>()
    mockSignInWithPassword.mockReturnValue(request.promise)

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in to admin/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    request.resolve({ error: null })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
