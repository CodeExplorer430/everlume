import { render, screen } from '@testing-library/react'

const mockLoginScreen = vi.fn()
const mockForgotPasswordScreen = vi.fn()
const mockResetPasswordScreen = vi.fn()

vi.mock('@/components/pages/auth/LoginScreen', () => ({
  LoginScreen: () => {
    mockLoginScreen()
    return <div data-testid="login-screen" />
  },
}))

vi.mock('@/components/pages/auth/ForgotPasswordScreen', () => ({
  ForgotPasswordScreen: () => {
    mockForgotPasswordScreen()
    return <div data-testid="forgot-password-screen" />
  },
}))

vi.mock('@/components/pages/auth/ResetPasswordScreen', () => ({
  ResetPasswordScreen: () => {
    mockResetPasswordScreen()
    return <div data-testid="reset-password-screen" />
  },
}))

describe('login page wrappers', () => {
  beforeEach(() => {
    mockLoginScreen.mockReset()
    mockForgotPasswordScreen.mockReset()
    mockResetPasswordScreen.mockReset()
  })

  it('renders login page wrapper', async () => {
    const mod = await import('@/app/login/page')
    render(mod.default())
    expect(screen.getByTestId('login-screen')).toBeInTheDocument()
  })

  it('renders forgot password page wrapper', async () => {
    const mod = await import('@/app/login/forgot-password/page')
    render(mod.default())
    expect(screen.getByTestId('forgot-password-screen')).toBeInTheDocument()
  })

  it('renders reset password page wrapper', async () => {
    const mod = await import('@/app/login/reset-password/page')
    render(mod.default())
    expect(screen.getByTestId('reset-password-screen')).toBeInTheDocument()
  })
})
