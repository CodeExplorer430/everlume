import { fireEvent, render, screen } from '@testing-library/react'
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

    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })

  it('blocks submission when passwords do not match', async () => {
    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different' } })

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()
  })

  it('uses fake auth password reset flow when enabled', async () => {
    process.env.NEXT_PUBLIC_E2E_FAKE_AUTH = '1'
    mockSearchParams.set('email', 'pending-admin@everlume.local')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    render(<ResetPasswordScreen />)

    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'ChangedPass1!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'ChangedPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/e2e-reset-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
