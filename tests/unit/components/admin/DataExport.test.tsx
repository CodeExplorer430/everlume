import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JSZip from 'jszip'
import { DataExport } from '@/components/admin/DataExport'

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

describe('DataExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('exports guestbook CSV and photo metadata CSV', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1/guestbook') {
          return new Response(
            JSON.stringify({
              entries: [
                {
                  id: 'g1',
                  name: 'Ana',
                  email: 'ana@example.com',
                  message: 'Forever loved',
                  is_approved: true,
                  created_at: '2026-01-01T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response(
            JSON.stringify({
              photos: [
                {
                  id: 'p1',
                  caption: 'Photo 1',
                  image_url: 'https://cdn.example.com/full.jpg',
                  thumb_url: 'https://cdn.example.com/thumb.jpg',
                  cloudinary_public_id: 'memorial/p1',
                  created_at: '2026-01-01T00:00:00.000Z',
                  taken_at: null,
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/media-consent') {
          return new Response(
            JSON.stringify({
              logs: [
                {
                  id: 'c1',
                  event_type: 'consent_granted',
                  access_mode: 'password',
                  consent_source: 'protected_media_gate',
                  media_kind: null,
                  media_variant: null,
                  ip_hash: 'iphash',
                  user_agent_hash: 'uahash',
                  created_at: '2026-01-01T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/guestbook',
        expect.anything()
      )
    })

    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/photos',
        expect.anything()
      )
    })

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/media-consent',
        expect.anything()
      )
    })

    expect(URL.createObjectURL).toHaveBeenCalledTimes(3)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(3)
  })

  it('exports a memorial json package with page, timeline, videos, guestbook, photos, and redirects', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1') {
          return new Response(
            JSON.stringify({
              memorial: {
                id: 'page-1',
                title: 'Jane Doe',
                slug: 'jane-doe',
                full_name: 'Jane Doe',
                dob: '1945-01-01',
                dod: '2025-01-01',
                accessMode: 'public',
              },
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response(
            JSON.stringify({
              photos: [
                {
                  id: 'p1',
                  caption: 'Garden',
                  image_url: null,
                  thumb_url: null,
                  cloudinary_public_id: null,
                  created_at: '2026-01-01T00:00:00.000Z',
                  taken_at: null,
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/videos') {
          return new Response(
            JSON.stringify({
              videos: [
                {
                  id: 'v1',
                  provider: 'youtube',
                  provider_id: 'abc123',
                  title: 'Tribute',
                  created_at: '2026-01-02T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/timeline') {
          return new Response(
            JSON.stringify({
              events: [{ id: 't1', year: 1972, text: 'A joyful milestone' }],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/guestbook') {
          return new Response(
            JSON.stringify({
              entries: [
                {
                  id: 'g1',
                  name: 'Ana',
                  email: null,
                  message: 'Forever loved',
                  is_approved: true,
                  created_at: '2026-01-03T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/redirects') {
          return new Response(
            JSON.stringify({
              redirects: [
                {
                  id: 'r1',
                  shortcode: 'jane',
                  target_url: 'https://example.com/memorials/jane-doe',
                  print_status: 'verified',
                  last_verified_at: '2026-01-04T00:00:00.000Z',
                  is_active: true,
                  created_at: '2026-01-04T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/media-consent') {
          return new Response(
            JSON.stringify({
              logs: [
                {
                  id: 'c1',
                  event_type: 'consent_granted',
                  access_mode: 'password',
                  consent_source: 'protected_media_gate',
                  media_kind: null,
                  media_variant: null,
                  ip_hash: 'iphash',
                  user_agent_hash: 'uahash',
                  created_at: '2026-01-05T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/photos',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/videos',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/timeline',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/guestbook',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/redirects',
        expect.anything()
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/memorials/page-1/media-consent',
        expect.anything()
      )
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const packageBlob = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0]
    expect(packageBlob).toBeInstanceOf(Blob)
    const packageText = await (packageBlob as Blob).text()
    expect(packageText).toContain('"memorialTitle": "Jane Doe"')
    expect(packageText).toContain('"memorialId": "page-1"')
    expect(packageText).toContain('"timeline"')
    expect(packageText).toContain('"videos"')
    expect(packageText).toContain('"redirects"')
    expect(packageText).toContain('"mediaConsent"')
  })

  it('shows no-data notice for guestbook export', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ entries: [] }), { status: 200 })
    )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(
      await screen.findByText('No guestbook entries to export.')
    ).toBeInTheDocument()
  })

  it('shows no-data notice for photo metadata export', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ photos: [] }), { status: 200 })
    )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    expect(await screen.findByText('No photos to export.')).toBeInTheDocument()
  })

  it('exports photos ZIP and surfaces API errors', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response(
            JSON.stringify({
              photos: [
                {
                  id: 'p1',
                  caption: 'Photo 1',
                  image_url: 'https://cdn.example.com/full.jpg',
                  thumb_url: 'https://cdn.example.com/thumb.jpg',
                  cloudinary_public_id: 'memorial/p1',
                  created_at: '2026-01-01T00:00:00.000Z',
                  taken_at: null,
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === 'https://cdn.example.com/full.jpg') {
          return new Response(Uint8Array.from([255, 216, 255, 217]), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/full.jpg')
    })
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Unable to load photos.' }), {
        status: 500,
      })
    )
    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    expect(
      await screen.findByText(/Export failed: Unable to load photos\./)
    ).toBeInTheDocument()
  })

  it('surfaces json export failures from dependent endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(
          JSON.stringify({ message: 'Unable to load videos.' }),
          { status: 500 }
        )
      }
      if (url === '/api/admin/memorials/page-1') {
        return new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'Jane Doe',
              slug: 'jane-doe',
              full_name: 'Jane Doe',
              dob: null,
              dod: null,
              accessMode: 'public',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/media-consent') {
        return new Response(JSON.stringify({ logs: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )
    expect(
      await screen.findByText('JSON export failed: Unable to load videos.')
    ).toBeInTheDocument()
  })

  it('exports media-consent csv rows with defaulted consent values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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
              ip_hash: 'iphash',
              user_agent_hash: 'uahash',
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const csvBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(csvBlob).toBeInstanceOf(Blob)
    const csvText = await (csvBlob as Blob).text()
    expect(csvText).toContain(
      'Event,Media Kind,Media Variant,Access Mode,Consent Version,Consent Source,IP Hash,User Agent Hash,Recorded At'
    )
    expect(csvText).toContain(
      'consent_granted,,,password,1,protected_media_gate,iphash,uahash,'
    )
  })

  it('exports media-consent csv rows with explicit media metadata and version values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          logs: [
            {
              id: 'c2',
              event_type: 'media_accessed',
              access_mode: 'private',
              consent_source: 'gallery',
              consent_version: 4,
              media_kind: 'photo',
              media_variant: 'thumb',
              ip_hash: 'hash-2',
              user_agent_hash: 'ua-2',
              created_at: '2026-01-02T00:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const csvBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(csvBlob).toBeInstanceOf(Blob)
    const csvText = await (csvBlob as Blob).text()
    expect(csvText).toContain(
      'media_accessed,photo,thumb,private,4,gallery,hash-2,ua-2,'
    )
  })

  it('shows the loading state while the memorial package export is pending', async () => {
    const memorialRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        return memorialRequest.promise
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ logs: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    const button = screen.getByRole('button', {
      name: /Export Memorial Package/i,
    })
    await user.click(button)

    expect(
      screen.getByRole('button', { name: /Preparing package/i })
    ).toBeDisabled()

    memorialRequest.resolve(
      new Response(
        JSON.stringify({
          memorial: {
            id: 'page-1',
            title: '',
            slug: 'jane-doe',
            full_name: 'Jane Doe',
            dob: null,
            dod: null,
            accessMode: 'public',
          },
        }),
        { status: 200 }
      )
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Export Memorial Package/i })
      ).toBeEnabled()
    })

    const packageBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(packageBlob).toBeInstanceOf(Blob)
    const packageText = await (packageBlob as Blob).text()
    expect(packageText).toContain('"memorialTitle": "Jane Doe"')
  })

  it('shows the loading labels for guestbook, media consent, and photo metadata exports', async () => {
    const guestbookRequest = deferredResponse()
    const consentRequest = deferredResponse()
    const photosRequest = deferredResponse()

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return guestbookRequest.promise
      }
      if (url === '/api/admin/memorials/page-1/media-consent') {
        return consentRequest.promise
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return photosRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(
      screen.getByRole('button', { name: /^Exporting\.\.\.$/i })
    ).toBeDisabled()
    guestbookRequest.resolve(
      new Response(JSON.stringify({ entries: [] }), { status: 200 })
    )
    await screen.findByText('No guestbook entries to export.')

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )
    expect(
      screen.getByRole('button', { name: /^Exporting\.\.\.$/i })
    ).toBeDisabled()
    consentRequest.resolve(
      new Response(JSON.stringify({ logs: [] }), { status: 200 })
    )
    await screen.findByText('No protected media consent records to export.')

    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    expect(
      screen.getByRole('button', { name: /^Exporting\.\.\.$/i })
    ).toBeDisabled()
    photosRequest.resolve(
      new Response(JSON.stringify({ photos: [] }), { status: 200 })
    )
    await screen.findByText('No photos to export.')
  })

  it('prefers the exported memorial title over the prop title when the payload includes one', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        return new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'Canonical Memorial Title',
              slug: 'jane-doe',
              full_name: 'Jane Doe',
              dob: null,
              dod: null,
              accessMode: 'public',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ logs: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Prop Title" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const packageBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(packageBlob).toBeInstanceOf(Blob)
    const packageText = await (packageBlob as Blob).text()
    expect(packageText).toContain('"memorialTitle": "Canonical Memorial Title"')
    expect(packageText).not.toContain('"memorialTitle": "Prop Title"')
  })

  it('shows fallback export errors for non-json responses and no-data media consent', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ logs: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response('still nope', { status: 500 }))

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(
      await screen.findByText(
        'Export failed: Unable to load guestbook entries.'
      )
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )
    expect(
      await screen.findByText('No protected media consent records to export.')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )
    expect(
      await screen.findByText(
        'Export failed: Unable to load protected media consent records.'
      )
    ).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('shows no-data notice while zip export is empty and exposes the loading label during download', async () => {
    const photosRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return photosRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )
    expect(
      screen.getByRole('button', { name: /Preparing ZIP/i })
    ).toBeDisabled()

    photosRequest.resolve(
      new Response(JSON.stringify({ photos: [] }), { status: 200 })
    )
    expect(await screen.findByText('No photos to export.')).toBeInTheDocument()
  })

  it('treats missing media-consent logs as an empty export', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )

    expect(
      await screen.findByText('No protected media consent records to export.')
    ).toBeInTheDocument()
  })

  it('clears a prior notice before showing a later export error', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ entries: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response('broken', { status: 500 }))

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(
      await screen.findByText('No guestbook entries to export.')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    expect(
      await screen.findByText('Export failed: Unable to load photos.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No guestbook entries to export.')
    ).not.toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clears a prior export error before showing a later no-data notice', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('broken', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ entries: [] }), { status: 200 })
      )

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Photo Metadata/i })
    )
    expect(
      await screen.findByText('Export failed: Unable to load photos.')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(
      await screen.findByText('No guestbook entries to export.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Export failed: Unable to load photos.')
    ).not.toBeInTheDocument()
  })

  it('skips failed image downloads and still generates a zip from remaining photos', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response(
            JSON.stringify({
              photos: [
                {
                  id: 'p1',
                  caption: 'Broken photo',
                  image_url: 'https://cdn.example.com/broken.jpg',
                  thumb_url: null,
                  cloudinary_public_id: 'memorial/p1',
                  created_at: '2026-01-01T00:00:00.000Z',
                  taken_at: null,
                },
                {
                  id: 'p2',
                  caption: 'Good photo',
                  image_url: 'https://cdn.example.com/good.jpg',
                  thumb_url: null,
                  cloudinary_public_id: 'memorial/p2',
                  created_at: '2026-01-02T00:00:00.000Z',
                  taken_at: null,
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === 'https://cdn.example.com/broken.jpg') {
          return new Response('broken', { status: 500, statusText: 'Broken' })
        }
        if (url === 'https://cdn.example.com/good.jpg') {
          return new Response(Uint8Array.from([255, 216, 255, 217]), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://cdn.example.com/broken.jpg'
      )
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/good.jpg')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
    expect(consoleError).toHaveBeenCalled()
  })

  it('skips null image urls and falls back to numbered jpg filenames in zip exports', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 'p1',
                caption: 'Missing image',
                image_url: null,
                thumb_url: null,
                cloudinary_public_id: null,
                created_at: '2026-01-01T00:00:00.000Z',
                taken_at: null,
              },
              {
                id: 'p2',
                caption: 'Fallback name',
                image_url: 'https://cdn.example.com/fallback.jpg',
                thumb_url: null,
                cloudinary_public_id: null,
                created_at: '2026-01-02T00:00:00.000Z',
                taken_at: null,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === 'https://cdn.example.com/fallback.jpg') {
        return {
          ok: true,
          headers: {
            get: vi.fn(() => null),
          },
          arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
        } as unknown as Response
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const zipBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(zipBlob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(zipBlob as Blob)
    const files = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir)

    expect(files).toEqual(['photos/photo_2.jpeg'])
  })

  it('falls back to a jpg extension when image content-type has no subtype', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 'p1',
                caption: 'Fallback extension',
                image_url: 'https://cdn.example.com/fallback-ext',
                thumb_url: null,
                cloudinary_public_id: null,
                created_at: '2026-01-01T00:00:00.000Z',
                taken_at: null,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === 'https://cdn.example.com/fallback-ext') {
        return {
          ok: true,
          headers: {
            get: vi.fn(() => 'image/'),
          },
          arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
        } as unknown as Response
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const zipBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(zipBlob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(zipBlob as Blob)
    const files = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir)

    expect(files).toEqual(['photos/photo_1.jpg'])
  })

  it('shows the zip fallback error when photo download or archive generation throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 'p1',
                caption: 'Photo 1',
                image_url: 'https://cdn.example.com/full.jpg',
                thumb_url: null,
                cloudinary_public_id: 'memorial/p1',
                created_at: '2026-01-01T00:00:00.000Z',
                taken_at: null,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === 'https://cdn.example.com/full.jpg') {
        throw new Error('Disk offline')
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    expect(
      await screen.findByText('ZIP export failed: Disk offline')
    ).toBeInTheDocument()
  })

  it('shows package failure when the memorial payload is missing the memorial record', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        return new Response(JSON.stringify({ memorial: null }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ logs: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    expect(
      await screen.findByText(
        'JSON export failed: Unable to load memorial details.'
      )
    ).toBeInTheDocument()
  })

  it('falls back to the default package error when a dependent endpoint fails with a non-json response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        return new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'Jane Doe',
              slug: 'jane-doe',
              full_name: 'Jane Doe',
              dob: null,
              dod: null,
              accessMode: 'public',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response('bad', { status: 500 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ logs: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    expect(
      await screen.findByText('JSON export failed: Unable to load videos.')
    ).toBeInTheDocument()
  })

  it('defaults missing memorial package collections to empty arrays', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        return new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'Jane Doe',
              slug: 'jane-doe',
              full_name: 'Jane Doe',
              dob: null,
              dod: null,
              accessMode: 'public',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: undefined }), {
          status: 200,
        })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const packageBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0]
    expect(packageBlob).toBeInstanceOf(Blob)
    const packageText = await (packageBlob as Blob).text()
    expect(packageText).toContain('"photos": []')
    expect(packageText).toContain('"videos": []')
    expect(packageText).toContain('"timeline": []')
    expect(packageText).toContain('"guestbook": []')
    expect(packageText).toContain('"redirects": []')
    expect(packageText).toContain('"mediaConsent": []')
  })

  it('shows the generic zip export fallback when a non-error value is thrown', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 'p1',
                caption: 'Photo 1',
                image_url: 'https://cdn.example.com/full.jpg',
                thumb_url: null,
                cloudinary_public_id: 'memorial/p1',
                created_at: '2026-01-01T00:00:00.000Z',
                taken_at: null,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === 'https://cdn.example.com/full.jpg') {
        throw 'boom'
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    expect(
      await screen.findByText('ZIP export failed: ZIP export failed.')
    ).toBeInTheDocument()
  })

  it('shows the generic package fallback when a non-error value is thrown', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1') {
        throw 'boom'
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Memorial Package/i })
    )

    expect(
      await screen.findByText('JSON export failed: JSON export failed.')
    ).toBeInTheDocument()
  })

  it('shows the generic media-consent export fallback when a non-error value is thrown', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/media-consent') {
        throw 'boom'
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Export Media Consent/i })
    )

    expect(
      await screen.findByText('Export failed: Export failed.')
    ).toBeInTheDocument()
  })

  it('downloads the generated photo zip using the expected memorial filename', async () => {
    const setAttributeSpy = vi.spyOn(
      HTMLAnchorElement.prototype,
      'setAttribute'
    )
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 'p1',
                caption: 'Photo 1',
                image_url: 'https://cdn.example.com/full.jpg',
                thumb_url: null,
                cloudinary_public_id: 'memorial/p1',
                created_at: '2026-01-01T00:00:00.000Z',
                taken_at: null,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === 'https://cdn.example.com/full.jpg') {
        return new Response(Uint8Array.from([255, 216, 255, 217]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(
      screen.getByRole('button', { name: /Download All Photos/i })
    )

    await waitFor(() => {
      expect(setAttributeSpy).toHaveBeenCalledWith(
        'download',
        'jane_doe_photos.zip'
      )
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    })
  })
})
