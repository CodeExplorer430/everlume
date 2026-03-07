import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginScreen } from '@/components/pages/auth/LoginScreen'

const mockSignInWithPassword = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockPush.mockReset()
    mockRefresh.mockReset()
  })

  it('signs in and navigates to admin on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in to Admin' }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'password123' })
    expect(mockPush).toHaveBeenCalledWith('/admin')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows auth error on failed sign in', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in to Admin' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
