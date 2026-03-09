import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
              consent_version: 2,
              media_kind: null,
              media_variant: null,
              ip_hash: '0123456789abcdefgh',
              user_agent_hash: 'fedcba9876543210',
              created_at: '2026-03-09T00:00:00.000Z',
            },
          ],
          memorial: { mediaConsentRevokedAt: null },
          consentNoticeVersion: 2,
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
    expect(screen.getByText('Active notice version 2')).toBeInTheDocument()
  })

  it('shows an explicit empty state when there are no records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ logs: [], memorial: { mediaConsentRevokedAt: null }, consentNoticeVersion: 1 }), { status: 200 })
    )

    render(<MemorialConsentLog memorialId="page-1" />)

    expect(await screen.findByText('No protected media consent events have been recorded yet.')).toBeInTheDocument()
  })

  it('shows an error state when the log request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Unable to load protected media consent records.' }), { status: 500 }))

    render(<MemorialConsentLog memorialId="page-1" />)

    expect(await screen.findByText('Unable to load protected media consent records.')).toBeInTheDocument()
  })

  it('revokes existing consent cookies for the memorial', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/media-consent' && (!init || !init.method)) {
        return new Response(JSON.stringify({ logs: [], memorial: { mediaConsentRevokedAt: null }, consentNoticeVersion: 3 }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/media-consent' && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true, revokedAt: '2026-03-09T12:00:00.000Z' }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<MemorialConsentLog memorialId="page-1" />)

    await screen.findByText('Active notice version 3')
    await user.click(screen.getByRole('button', { name: 'Revoke Existing Consent' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/media-consent', { method: 'POST' })
    expect(await screen.findByText('Existing protected-media consent cookies were revoked for this memorial.')).toBeInTheDocument()
  })

  it('shows a revoke error when consent revocation fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/media-consent' && (!init || !init.method)) {
        return new Response(JSON.stringify({ logs: [], memorial: { mediaConsentRevokedAt: null }, consentNoticeVersion: 3 }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/media-consent' && init?.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Unable to revoke protected media consent.' }), { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<MemorialConsentLog memorialId="page-1" />)

    await screen.findByText('Active notice version 3')
    await user.click(screen.getByRole('button', { name: 'Revoke Existing Consent' }))

    expect(await screen.findByText('Unable to revoke protected media consent.')).toBeInTheDocument()
  })
})
