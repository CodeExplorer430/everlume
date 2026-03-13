import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProtectedMediaConsentGate } from '@/components/public/ProtectedMediaConsentGate'

describe('ProtectedMediaConsentGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the default protected-media notice copy and version', () => {
    render(<ProtectedMediaConsentGate slug="jane-doe" />)

    expect(screen.getByText('Media Viewing Notice')).toBeInTheDocument()
    expect(
      screen.getByText(
        /The family has protected this memorial's photos and videos/i
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Consent version 1')).toBeInTheDocument()
  })

  it('posts consent and reloads on success', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
    const user = userEvent.setup()

    render(<ProtectedMediaConsentGate slug="jane-doe" />)
    await user.click(
      screen.getByRole('button', { name: /continue to protected media/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/memorials/jane-doe/media-consent',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(reloadMock).toHaveBeenCalled()
  })

  it('shows the submitting state while consent confirmation is pending', async () => {
    let resolveResponse: (response: Response) => void
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => responsePromise
    )
    const user = userEvent.setup()

    render(
      <ProtectedMediaConsentGate
        slug="jane-doe"
        title="Family photo notice"
        body="Please confirm before viewing private family media."
        version={4}
      />
    )

    await user.click(
      screen.getByRole('button', { name: /continue to protected media/i })
    )

    expect(screen.getByRole('button', { name: 'Confirming...' })).toBeDisabled()
    expect(screen.getByText('Family photo notice')).toBeInTheDocument()
    expect(screen.getByText('Consent version 4')).toBeInTheDocument()

    resolveResponse!(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
  })

  it('shows a server error when consent cannot be recorded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Unable to record media consent.' }),
        { status: 500 }
      )
    )
    const user = userEvent.setup()

    render(<ProtectedMediaConsentGate slug="jane-doe" />)
    await user.click(
      screen.getByRole('button', { name: /continue to protected media/i })
    )

    expect(
      await screen.findByText('Unable to record media consent.')
    ).toBeInTheDocument()
  })

  it('falls back to the default error for non-json failures and clears it on retry', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('bad', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    const user = userEvent.setup()
    render(<ProtectedMediaConsentGate slug="jane-doe" />)

    await user.click(
      screen.getByRole('button', { name: /continue to protected media/i })
    )
    expect(
      await screen.findByText('Unable to confirm media consent right now.')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /continue to protected media/i })
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Unable to confirm media consent right now.')
      ).not.toBeInTheDocument()
      expect(reloadMock).toHaveBeenCalled()
    })
  })
})
