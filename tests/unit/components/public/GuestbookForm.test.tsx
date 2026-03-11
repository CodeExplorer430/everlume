import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { GuestbookForm } from '@/components/public/GuestbookForm'

let scriptState: 'success' | 'error' | 'pending' = 'success'

function ScriptMock({
  onLoad,
  onError,
}: {
  onLoad?: () => void
  onError?: () => void
}) {
  useEffect(() => {
    if (scriptState === 'pending') return
    if (scriptState === 'error') {
      onError?.()
      return
    }
    onLoad?.()
  }, [onError, onLoad])
  return null
}

vi.mock('next/script', () => ({
  default: ScriptMock,
}))

describe('GuestbookForm', () => {
  const originalTurnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = ''
    scriptState = 'success'
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalTurnstileSiteKey
  })

  it('submits and shows success message', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guestbook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"memorialId":"page-1"'),
      })
    )
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()
  })

  it('shows API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'CONFIGURATION_ERROR',
          message: 'Service unavailable',
        }),
        { status: 503 }
      )
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        /temporarily unavailable while protection settings are being finalized/i
      )
    ).toBeInTheDocument()
  })

  it('requires turnstile token and submits captchaToken when configured', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
    let onSolved: ((token: string) => void) | undefined
    let onExpired: (() => void) | undefined
    const resetMock = vi.fn()

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: vi.fn(
          (_container: HTMLElement, options: Record<string, unknown>) => {
            onSolved = options.callback as (token: string) => void
            onExpired = options['expired-callback'] as () => void
            return 'widget-1'
          }
        ),
        reset: resetMock,
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))
    expect(
      await screen.findByText(
        'Please complete the spam-protection check before posting.'
      )
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      onSolved?.('token-123')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guestbook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"captchaToken":"token-123"'),
      })
    )
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()

    await act(async () => {
      onExpired?.()
    })
    await user.click(
      screen.getByRole('button', { name: 'Write another message' })
    )
    expect(resetMock).toHaveBeenCalledWith('widget-1')
  })

  it('shows retry guidance when rate limited', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'RATE_LIMITED', message: 'Too many requests.' }),
        { status: 429 }
      )
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(/Too many messages were sent recently/i)
    ).toBeInTheDocument()
  })

  it('short-circuits to local success when the honeypot field is filled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    const { container } = render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.type(
      container.querySelector('input[name="website"]') as HTMLInputElement,
      'spam-link'
    )
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()
  })

  it('shows loading guidance while captcha is still initializing', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    scriptState = 'pending'
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      await screen.findByText(
        'Spam protection is still loading. Please wait a moment and try again.'
      )
    ).toBeInTheDocument()
  })

  it('shows a network failure and resets captcha when submission cannot reach the api', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    let onSolved: ((token: string) => void) | undefined
    const resetMock = vi.fn()

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: vi.fn(
          (_container: HTMLElement, options: Record<string, unknown>) => {
            onSolved = options.callback as (token: string) => void
            return 'widget-1'
          }
        ),
        reset: resetMock,
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')

    await act(async () => {
      onSolved?.('token-123')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'The guestbook could not be reached. Please check your connection and try again.'
      )
    ).toBeInTheDocument()
    expect(resetMock).toHaveBeenCalledWith('widget-1')
  })

  it('surfaces turnstile runtime errors', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    let onSolved: ((token: string) => void) | undefined
    let onErrorCallback: (() => void) | undefined

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: vi.fn(
          (_container: HTMLElement, options: Record<string, unknown>) => {
            onSolved = options.callback as (token: string) => void
            onErrorCallback = options['error-callback'] as () => void
            return 'widget-1'
          }
        ),
        reset: vi.fn(),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<GuestbookForm memorialId="page-1" />)

    await act(async () => {
      onErrorCallback?.()
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/Spam protection failed to load/i)
    ).toBeInTheDocument()
    expect(onSolved).toBeTypeOf('function')
  })

  it('resets the form and captcha after a successful retry submission', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
    let onSolved: ((token: string) => void) | undefined
    const resetMock = vi.fn()

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: vi.fn(
          (_container: HTMLElement, options: Record<string, unknown>) => {
            onSolved = options.callback as (token: string) => void
            return 'widget-1'
          }
        ),
        reset: resetMock,
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await act(async () => {
      onSolved?.('token-456')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).toHaveBeenCalled()
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Write another message' })
    )
    expect(screen.getByLabelText('Your Name')).toHaveValue('')
    expect(screen.getByLabelText('Your Message')).toHaveValue('')
    expect(resetMock).toHaveBeenCalledWith('widget-1')
  })

  it('shows a load failure when captcha script cannot initialize', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    scriptState = 'error'

    render(<GuestbookForm memorialId="page-1" />)

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
    expect(
      await screen.findByText(/Spam protection failed to load/i)
    ).toBeInTheDocument()
  })
})
