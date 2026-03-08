import { render, screen, waitFor } from '@testing-library/react'
import { MemorialConsentLog } from '@/components/admin/MemorialConsentLog'

describe('MemorialConsentLog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and renders recent consent records', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          logs: [
            {
              id: 'c1',
              event_type: 'consent_granted',
              access_mode: 'password',
              consent_source: 'protected_media_gate',
              media_kind: null,
              media_variant: null,
              ip_hash: '0123456789abcdefgh',
              user_agent_hash: 'fedcba9876543210',
              created_at: '2026-03-09T00:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    )

    render(<MemorialConsentLog memorialId="page-1" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/media-consent', expect.anything())
    })
    expect(await screen.findByText('Consent granted')).toBeInTheDocument()
    expect(screen.getByText(/IP 0123456789ab/)).toBeInTheDocument()
  })

  it('shows an explicit empty state when there are no records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ logs: [] }), { status: 200 }))

    render(<MemorialConsentLog memorialId="page-1" />)

    expect(await screen.findByText('No protected media consent events have been recorded yet.')).toBeInTheDocument()
  })

  it('shows an error state when the log request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Unable to load protected media consent records.' }), { status: 500 }))

    render(<MemorialConsentLog memorialId="page-1" />)

    expect(await screen.findByText('Unable to load protected media consent records.')).toBeInTheDocument()
  })
})
