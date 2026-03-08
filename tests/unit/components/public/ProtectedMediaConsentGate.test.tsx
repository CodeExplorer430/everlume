import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProtectedMediaConsentGate } from '@/components/public/ProtectedMediaConsentGate'

describe('ProtectedMediaConsentGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts consent and reloads on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
    const user = userEvent.setup()

    render(<ProtectedMediaConsentGate slug="jane-doe" />)
    await user.click(screen.getByRole('button', { name: /continue to protected media/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/memorials/jane-doe/media-consent',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(reloadMock).toHaveBeenCalled()
  })

  it('shows a server error when consent cannot be recorded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Unable to record media consent.' }), { status: 500 }))
    const user = userEvent.setup()

    render(<ProtectedMediaConsentGate slug="jane-doe" />)
    await user.click(screen.getByRole('button', { name: /continue to protected media/i }))

    expect(await screen.findByText('Unable to record media consent.')).toBeInTheDocument()
  })
})
