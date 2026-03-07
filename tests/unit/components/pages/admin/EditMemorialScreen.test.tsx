import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMemorialScreen } from '@/components/pages/admin/EditMemorialScreen'

vi.mock('@/components/admin/MediaUpload', () => ({
  MediaUpload: () => <div>Media Upload Mock</div>,
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

vi.mock('@/components/admin/AdminPageInfo', () => ({
  AdminPageInfo: () => <div>Admin Page Info Mock</div>,
}))

vi.mock('@/components/admin/AdminQRCodeSection', () => ({
  AdminQRCodeSection: () => <div>QR Section Mock</div>,
}))

vi.mock('@/components/admin/AdminPhotoGallery', () => ({
  AdminPhotoGallery: ({ onSetHero }: { onSetHero: (url: string) => void }) => (
    <button onClick={() => onSetHero('https://cdn.example.com/hero.jpg')}>Set Hero Mock</button>
  ),
}))

describe('EditMemorialScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows page not found when page request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'not found' }), { status: 404 }))

    render(<EditMemorialScreen pageId="page-1" />)

    expect(await screen.findByText('Page not found.')).toBeInTheDocument()
  })

  it('loads page data and allows setting hero image', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/pages/page-1' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            page: {
              id: 'page-1',
              title: 'In Memory',
              slug: 'in-memory',
              full_name: 'Jane Doe',
              dob: null,
              dod: null,
              privacy: 'public',
              hero_image_url: null,
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/pages/page-1/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      if (url === '/api/admin/pages/page-1/photos') {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 })
      }
      if (url === '/api/admin/pages/page-1' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<EditMemorialScreen pageId="page-1" />)

    expect(await screen.findByText('Edit Memorial: In Memory')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view public page/i })).toHaveAttribute('href', '/memorials/in-memory')

    await user.click(screen.getByRole('button', { name: 'Set Hero Mock' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/pages/page-1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})
