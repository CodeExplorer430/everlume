import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataExport } from '@/components/admin/DataExport'

describe('DataExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('exports guestbook CSV and photo metadata CSV', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/guestbook', expect.anything())
    })

    await user.click(screen.getByRole('button', { name: /Export Photo Metadata/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/photos', expect.anything())
    })

    await user.click(screen.getByRole('button', { name: /Export Media Consent/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/media-consent', expect.anything())
    })

    expect(URL.createObjectURL).toHaveBeenCalledTimes(3)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(3)
  })

  it('exports a memorial json package with page, timeline, videos, guestbook, photos, and redirects', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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
        return new Response(JSON.stringify({ photos: [{ id: 'p1', caption: 'Garden', image_url: null, thumb_url: null, cloudinary_public_id: null, created_at: '2026-01-01T00:00:00.000Z', taken_at: null }] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(JSON.stringify({ videos: [{ id: 'v1', provider: 'youtube', provider_id: 'abc123', title: 'Tribute', created_at: '2026-01-02T00:00:00.000Z' }] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/timeline') {
        return new Response(JSON.stringify({ events: [{ id: 't1', year: 1972, text: 'A joyful milestone' }] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/guestbook') {
        return new Response(JSON.stringify({ entries: [{ id: 'g1', name: 'Ana', email: null, message: 'Forever loved', is_approved: true, created_at: '2026-01-03T00:00:00.000Z' }] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [{ id: 'r1', shortcode: 'jane', target_url: 'https://example.com/memorials/jane-doe', print_status: 'verified', last_verified_at: '2026-01-04T00:00:00.000Z', is_active: true, created_at: '2026-01-04T00:00:00.000Z' }] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/media-consent') {
        return new Response(JSON.stringify({ logs: [{ id: 'c1', event_type: 'consent_granted', access_mode: 'password', consent_source: 'protected_media_gate', media_kind: null, media_variant: null, ip_hash: 'iphash', user_agent_hash: 'uahash', created_at: '2026-01-05T00:00:00.000Z' }] }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Memorial Package/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/photos', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/videos', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/timeline', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/guestbook', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/redirects', expect.anything())
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/memorials/page-1/media-consent', expect.anything())
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ entries: [] }), { status: 200 }))

    const user = userEvent.setup()
    render(<DataExport memorialId="page-1" memorialTitle="Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /Export Guestbook/i }))
    expect(await screen.findByText('No guestbook entries to export.')).toBeInTheDocument()
  })

  it('exports photos ZIP and surfaces API errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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

    await user.click(screen.getByRole('button', { name: /Download All Photos/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/full.jpg')
    })
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unable to load photos.' }), { status: 500 }))
    await user.click(screen.getByRole('button', { name: /Export Photo Metadata/i }))
    expect(await screen.findByText(/Export failed: Unable to load photos\./)).toBeInTheDocument()
  })

  it('surfaces json export failures from dependent endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1/videos') {
        return new Response(JSON.stringify({ message: 'Unable to load videos.' }), { status: 500 })
      }
      if (url === '/api/admin/memorials/page-1') {
        return new Response(JSON.stringify({ memorial: { id: 'page-1', title: 'Jane Doe', slug: 'jane-doe', full_name: 'Jane Doe', dob: null, dod: null, accessMode: 'public' } }), { status: 200 })
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

    await user.click(screen.getByRole('button', { name: /Export Memorial Package/i }))
    expect(await screen.findByText('JSON export failed: Unable to load videos.')).toBeInTheDocument()
  })
})
