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

  it('shows the network fallback without captcha enabled', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'The guestbook could not be reached. Please check your connection and try again.'
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

  it('does not render the turnstile widget again when the component rerenders with an existing widget id', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const renderMock = vi.fn(() => 'widget-1')

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: renderMock,
        reset: vi.fn(),
        remove: vi.fn(),
      },
      configurable: true,
    })

    const { rerender } = render(<GuestbookForm memorialId="page-1" />)

    await screen.findByTestId('turnstile-widget')
    expect(renderMock).toHaveBeenCalledTimes(1)

    rerender(<GuestbookForm memorialId="page-1" />)

    expect(renderMock).toHaveBeenCalledTimes(1)
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

  it('maps too-fast validation errors to the pacing guidance copy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'TOO_FAST' }), { status: 429 })
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'Please take a moment before sending your message.'
      )
    ).toBeInTheDocument()
  })

  it.each([
    [
      'DATABASE_ERROR',
      'The guestbook is temporarily unavailable. Please try again shortly.',
    ],
    [
      'VALIDATION_ERROR',
      'Please review your name and message, then try again.',
    ],
    [
      'CAPTCHA_FAILED',
      'Please complete the spam-protection check before posting.',
    ],
  ])('maps %s responses to the expected fallback copy', async (code, text) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code }), { status: 400 })
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('uses memorial-not-found and raw-message fallbacks for other API failures', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'MEMORIAL_NOT_FOUND' }), {
          status: 404,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'UNKNOWN_CODE',
            message: 'Custom fallback from the API.',
          }),
          { status: 500 }
        )
      )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'This memorial is no longer available for new guestbook messages.'
      )
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))
    expect(
      await screen.findByText('Custom fallback from the API.')
    ).toBeInTheDocument()
  })

  it('falls back to the generic submit error when the api response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('service unavailable', { status: 500 })
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText('Unable to submit your message right now.')
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

  it('shows the script-load failure guidance before submission when captcha script loading fails', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    scriptState = 'error'
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      await screen.findByText(
        'Spam protection failed to load. Refresh the page and try again.'
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

  it('resets captcha after a network failure and after returning from the success state', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(
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
      onSolved?.('token-123')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'The guestbook could not be reached. Please check your connection and try again.'
      )
    ).toBeInTheDocument()
    expect(resetMock).toHaveBeenCalledWith('widget-1')

    await act(async () => {
      onSolved?.('token-456')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Write another message' })
    )
    expect(resetMock).toHaveBeenLastCalledWith('widget-1')
  })

  it('resets captcha after an api validation failure when captcha is enabled', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'VALIDATION_ERROR' }), {
        status: 400,
      })
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
      onSolved?.('token-123')
    })
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(
      await screen.findByText(
        'Please review your name and message, then try again.'
      )
    ).toBeInTheDocument()
    expect(resetMock).toHaveBeenCalledWith('widget-1')
  })

  it('shows the submitting state while the guestbook request is pending', async () => {
    const request = new Promise<Response>(() => {})
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => request)
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled()
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

  it('removes the turnstile widget on unmount when a widget was rendered', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    const removeMock = vi.fn()

    Object.defineProperty(window, 'turnstile', {
      value: {
        render: vi.fn(() => 'widget-1'),
        reset: vi.fn(),
        remove: removeMock,
      },
      configurable: true,
    })

    const { unmount } = render(<GuestbookForm memorialId="page-1" />)
    unmount()

    expect(removeMock).toHaveBeenCalledWith('widget-1')
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

  it('resets the success screen without captcha when write-another-message is pressed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 201 })
    )
    const user = userEvent.setup()

    render(<GuestbookForm memorialId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Write another message' })
    )

    expect(screen.getByLabelText('Your Name')).toHaveValue('')
    expect(screen.getByLabelText('Your Message')).toHaveValue('')
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
