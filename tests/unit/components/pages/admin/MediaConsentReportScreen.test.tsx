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

    expect(
      await screen.findByText('Consent and Access Report')
    ).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText('Event type'),
      'consent_granted'
    )
    expect(screen.getAllByText('Consent granted').length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Media accessed', { selector: 'td' })
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Search memorials'), 'mateo')
    expect(screen.getByText('Mateo Rivera')).toBeInTheDocument()
  })

  it('shows an explicit empty state and keeps export disabled without rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ logs: [] }), { status: 200 })
    )

    render(<MediaConsentReportScreen />)

    expect(
      await screen.findByText(
        'No protected-media consent events match the current filters.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('shows the API error when report loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Consent report unavailable.' }), {
        status: 500,
      })
    )

    render(<MediaConsentReportScreen />)

    expect(
      await screen.findByText('Consent report unavailable.')
    ).toBeInTheDocument()
  })

  it('exports the filtered report as csv and revokes the object url', async () => {
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
          ],
        }),
        { status: 200 }
      )
    )

    const exportCapture: { blob?: Blob } = {}
    const createObjectURL = vi.fn((value: Blob | MediaSource) => {
      if (value instanceof Blob) {
        exportCapture.blob = value
      }
      return 'blob:consent-report'
    })
    const revokeObjectURL = vi.fn()
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })

    const originalCreateElement = document.createElement.bind(document)
    const createdLink = originalCreateElement('a') as HTMLAnchorElement
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string
    ) => {
      if (tagName === 'a') {
        return createdLink
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    try {
      const user = userEvent.setup()
      render(<MediaConsentReportScreen />)

      expect(
        await screen.findByText('Consent and Access Report')
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Export CSV' }))

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(createdLink.download).toBe('everlume_media_consent_report.csv')
      expect(createdLink.href).toBe('blob:consent-report')
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:consent-report')

      expect(exportCapture.blob).toBeInstanceOf(Blob)
      if (!(exportCapture.blob instanceof Blob)) {
        throw new Error('Expected CSV blob to be created.')
      }
      const csv = await exportCapture.blob.text()
      expect(csv).toContain('memorial_title,memorial_slug,event_type')
      expect(csv).toContain('"Mateo Rivera","mateo-rivera","consent_granted"')
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      })
    }
  })

  it('shows fallback error copy for non-json failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('upstream exploded', { status: 500 })
    )

    render(<MediaConsentReportScreen />)

    expect(
      await screen.findByText('Unable to load protected media consent report.')
    ).toBeInTheDocument()
  })

  it('shows the filtered empty state after loading rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
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
          ],
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<MediaConsentReportScreen />)

    expect(
      await screen.findByText('Consent and Access Report')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()

    await user.type(screen.getByLabelText('Search memorials'), 'no matches')

    expect(
      screen.getByText(
        'No protected-media consent events match the current filters.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })
})
