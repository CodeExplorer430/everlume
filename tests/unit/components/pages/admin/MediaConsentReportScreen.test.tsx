import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaConsentReportScreen } from '@/components/pages/admin/MediaConsentReportScreen'

describe('MediaConsentReportScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads summary cards and filters report rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          logs: [
            {
              id: 'log-1',
              memorialId: 'memorial-1',
              memorialTitle: 'Mateo Rivera',
              memorialSlug: 'mateo-rivera',
              eventType: 'consent_granted',
              accessMode: 'password',
              consentSource: 'protected_media_gate',
              consentVersion: 2,
              mediaKind: null,
              mediaVariant: null,
              ipHash: 'ip-hash-1',
              userAgentHash: 'ua-hash-1',
              createdAt: '2026-03-09T00:00:00.000Z',
            },
            {
              id: 'log-2',
              memorialId: 'memorial-1',
              memorialTitle: 'Mateo Rivera',
              memorialSlug: 'mateo-rivera',
              eventType: 'media_accessed',
              accessMode: 'password',
              consentSource: 'protected_media_gate',
              consentVersion: 2,
              mediaKind: 'gallery_image',
              mediaVariant: 'image',
              ipHash: 'ip-hash-2',
              userAgentHash: 'ua-hash-2',
              createdAt: '2026-03-09T01:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<MediaConsentReportScreen />)

    expect(await screen.findByText('Consent and Access Report')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Event type'), 'consent_granted')
    expect(screen.getAllByText('Consent granted').length).toBeGreaterThan(0)
    expect(screen.queryByText('Media accessed', { selector: 'td' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Search memorials'), 'mateo')
    expect(screen.getByText('Mateo Rivera')).toBeInTheDocument()
  })

  it('shows an explicit empty state and keeps export disabled without rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ logs: [] }), { status: 200 }))

    render(<MediaConsentReportScreen />)

    expect(await screen.findByText('No protected-media consent events match the current filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('shows the API error when report loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Consent report unavailable.' }), { status: 500 }))

    render(<MediaConsentReportScreen />)

    expect(await screen.findByText('Consent report unavailable.')).toBeInTheDocument()
  })
})
