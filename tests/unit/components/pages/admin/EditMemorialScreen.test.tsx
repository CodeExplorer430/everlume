import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMemorialScreen } from '@/components/pages/admin/EditMemorialScreen'

const mockMediaUpload = vi.fn(
  ({ onUploadComplete }: { onUploadComplete: () => void }) => (
    <button onClick={() => void onUploadComplete()}>
      Trigger Upload Refresh
    </button>
  )
)
const mockAdminMemorialInfo = vi.fn(
  ({ memorial }: { memorial: { accessMode: string } }) => (
    <div>Admin Memorial Info Mock: {memorial.accessMode}</div>
  )
)
const mockAdminQRCodeSection = vi.fn(
  ({ redirects }: { redirects: Array<{ id: string }> }) => (
    <div>Redirect Count: {redirects.length}</div>
  )
)
const mockAdminPhotoGallery = vi.fn(
  ({
    photos,
    heroImageUrl,
    onRefresh,
    onSetHero,
  }: {
    photos: Array<{ id: string }>
    heroImageUrl: string | null
    onRefresh: () => void
    onSetHero: (url: string) => void
  }) => (
    <div>
      <p>Photo Count: {photos.length}</p>
      <p>Hero URL: {heroImageUrl ?? 'none'}</p>
      <button
        onClick={() => void onSetHero('https://cdn.example.com/hero.jpg')}
      >
        Set Hero Mock
      </button>
      <button onClick={() => void onRefresh()}>Refresh Gallery Mock</button>
    </div>
  )
)

vi.mock('@/components/admin/MediaUpload', () => ({
  MediaUpload: (props: { onUploadComplete: () => void }) =>
    mockMediaUpload(props),
}))

vi.mock('@/components/admin/TimelineEditor', () => ({
  TimelineEditor: () => <div>Timeline Editor Mock</div>,
}))

vi.mock('@/components/admin/VideoManager', () => ({
  VideoManager: () => <div>Video Manager Mock</div>,
}))

vi.mock('@/components/admin/DataExport', () => ({
  DataExport: () => <div>Data Export Mock</div>,
}))

vi.mock('@/components/admin/AdminMemorialInfo', () => ({
  AdminMemorialInfo: (props: { memorial: { accessMode: string } }) =>
    mockAdminMemorialInfo(props),
}))

vi.mock('@/components/admin/AdminQRCodeSection', () => ({
  AdminQRCodeSection: (props: { redirects: Array<{ id: string }> }) =>
    mockAdminQRCodeSection(props),
}))

vi.mock('@/components/admin/AdminPhotoGallery', () => ({
  AdminPhotoGallery: (props: {
    photos: Array<{ id: string }>
    heroImageUrl: string | null
    onRefresh: () => void
    onSetHero: (url: string) => void
  }) => mockAdminPhotoGallery(props),
}))

vi.mock('@/components/admin/MemorialConsentLog', () => ({
  MemorialConsentLog: () => <div>Memorial Consent Log Mock</div>,
}))

describe('EditMemorialScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockMediaUpload.mockClear()
    mockAdminMemorialInfo.mockClear()
    mockAdminQRCodeSection.mockClear()
    mockAdminPhotoGallery.mockClear()
  })

  it('shows the loading state before memorial data resolves', async () => {
    let resolveMemorial: ((value: Response) => void) | undefined

    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1' && (!init || !init.method)) {
        return new Promise((resolve) => {
          resolveMemorial = resolve
        })
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return Promise.resolve(
          new Response(JSON.stringify({ redirects: [] }), { status: 200 })
        )
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return Promise.resolve(
          new Response(JSON.stringify({ photos: [] }), { status: 200 })
        )
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    })

    render(<EditMemorialScreen memorialId="page-1" />)

    expect(screen.getByText('Loading memorial editor...')).toBeInTheDocument()
    await waitFor(() => expect(resolveMemorial).toBeTypeOf('function'))

    await act(async () => {
      resolveMemorial?.(
        new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'In Memory',
              slug: 'in-memory',
              full_name: 'Jane Doe',
              dedicationText: null,
              dob: null,
              dod: null,
              accessMode: 'public',
              hero_image_url: null,
            },
          }),
          { status: 200 }
        )
      )
    })

    expect(
      await screen.findByText('Edit Memorial: In Memory')
    ).toBeInTheDocument()
  })

  it('shows fallback load error copy when the memorial request fails with non-json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('upstream exploded', { status: 500 })
    )

    render(<EditMemorialScreen memorialId="page-1" />)

    expect(
      await screen.findByText('Unable to load memorial.')
    ).toBeInTheDocument()
    expect(await screen.findByText('Memorial not found.')).toBeInTheDocument()
  })

  it('loads memorial data and allows setting hero image', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              memorial: {
                id: 'page-1',
                title: 'In Memory',
                slug: 'in-memory',
                full_name: 'Jane Doe',
                dob: null,
                dod: null,
                accessMode: 'public',
                hero_image_url: null,
                memorial_theme: 'classic',
                memorial_slideshow_enabled: true,
                memorial_slideshow_interval_ms: 4500,
                memorial_video_layout: 'grid',
                qr_template: 'classic',
                qr_caption: 'Scan me!',
              },
            }),
            { status: 200 }
          )
        }

        if (url === '/api/admin/memorials/page-1/redirects') {
          return new Response(JSON.stringify({ redirects: [] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response(JSON.stringify({ photos: [] }), { status: 200 })
        }
        if (url === '/api/admin/memorials/page-1' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }

        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<EditMemorialScreen memorialId="page-1" />)

    expect(
      await screen.findByText('Edit Memorial: In Memory')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Manage memorial details, media, timeline, and sharing tools.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /view public memorial/i })
    ).toHaveAttribute('href', '/memorials/in-memory')
    expect(screen.getByText('Hero URL: none')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Set Hero Mock' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/memorials/page-1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(
      await screen.findByText('Hero URL: https://cdn.example.com/hero.jpg')
    ).toBeInTheDocument()
  })

  it('falls back to empty related data, hides the public link, and reuses refresh orchestration', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/memorials/page-1' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              memorial: {
                id: 'page-1',
                title: 'Private Memory',
                slug: 'private-memory',
                full_name: 'Jane Doe',
                dedicationText: null,
                dob: null,
                dod: null,
                accessMode: 'password',
                hero_image_url: null,
              },
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/memorials/page-1/redirects') {
          return new Response('redirects unavailable', { status: 500 })
        }
        if (url === '/api/admin/memorials/page-1/photos') {
          return new Response('photos unavailable', { status: 500 })
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

    const user = userEvent.setup()
    render(<EditMemorialScreen memorialId="page-1" />)

    expect(
      await screen.findByText('Edit Memorial: Private Memory')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /view public memorial/i })
    ).not.toBeInTheDocument()
    expect(screen.getByText('Redirect Count: 0')).toBeInTheDocument()
    expect(screen.getByText('Photo Count: 0')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Trigger Upload Refresh' })
    )
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            String(input) === '/api/admin/memorials/page-1' &&
            (!init || !(init as RequestInit).method)
        )
      ).toHaveLength(2)
    })

    await user.click(
      screen.getByRole('button', { name: 'Refresh Gallery Mock' })
    )
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            String(input) === '/api/admin/memorials/page-1' &&
            (!init || !(init as RequestInit).method)
        )
      ).toHaveLength(3)
    })
  })

  it('shows a fallback error when the hero image update fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/memorials/page-1' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            memorial: {
              id: 'page-1',
              title: 'In Memory',
              slug: 'in-memory',
              full_name: 'Jane Doe',
              dedicationText: null,
              dob: null,
              dod: null,
              accessMode: 'public',
              hero_image_url: null,
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/memorials/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/memorials/page-1' && init?.method === 'PATCH') {
        return new Response('hero write failed', { status: 500 })
      }

      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<EditMemorialScreen memorialId="page-1" />)

    expect(
      await screen.findByText('Edit Memorial: In Memory')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Set Hero Mock' }))

    expect(
      await screen.findByText('Unable to update hero image.')
    ).toBeInTheDocument()
    expect(screen.getByText('Hero URL: none')).toBeInTheDocument()
  })
})
