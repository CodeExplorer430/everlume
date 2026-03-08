import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPageInfo } from '@/components/admin/AdminPageInfo'

type AdminPageProps = React.ComponentProps<typeof AdminPageInfo>['page']

function makePage(overrides: Partial<AdminPageProps> = {}): AdminPageProps {
  return {
    id: 'page-1',
    title: 'Sample',
    slug: 'sample',
    full_name: 'Jane Doe',
    dob: null,
    dod: null,
    accessMode: 'public' as const,
    memorial_theme: 'classic' as const,
    memorial_slideshow_enabled: true,
    memorial_slideshow_interval_ms: 4500,
    memorial_video_layout: 'grid' as const,
    qr_template: 'classic' as const,
    qr_caption: 'Scan me!',
    ...overrides,
  }
}

describe('AdminPageInfo', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resets form values when page prop changes', async () => {
    const onUpdate = vi.fn()
    const { rerender } = render(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={makePage({ title: 'First Title', slug: 'first-title' })}
      />
    )

    const user = userEvent.setup()
    const titleInput = screen.getByLabelText('Memorial Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited Locally')
    expect(titleInput).toHaveValue('Edited Locally')

    rerender(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={makePage({ title: 'Server Updated Title', slug: 'first-title' })}
      />
    )

    expect(screen.getByLabelText('Memorial Title')).toHaveValue('Server Updated Title')
  })

  it('submits updates in password mode and clears password on success', async () => {
    const onUpdate = vi.fn()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const user = userEvent.setup()

    render(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={makePage({ id: 'page-9', full_name: null })}
      />
    )

    await user.selectOptions(screen.getByLabelText('Access mode'), 'password')
    const passwordInput = screen.getByLabelText('Set or Rotate Password')
    await user.type(passwordInput, 'secret123')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/memorials/page-9',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      accessMode: 'password',
      password: 'secret123',
      title: 'Sample',
      slug: 'sample',
      memorialTheme: 'classic',
      memorialVideoLayout: 'grid',
      qrTemplate: 'classic',
      qrCaption: 'Scan me!',
    })
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText('Set or Rotate Password')).toHaveValue('')
  })

  it('shows server error message when update fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Slug already exists.' }), { status: 409 }))
    const user = userEvent.setup()

    render(
      <AdminPageInfo
        onUpdate={vi.fn()}
        page={makePage({ id: 'page-7', full_name: 'Jane', accessMode: 'private' })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Slug already exists.')).toBeInTheDocument()
  })

  it('updates access guidance when access mode changes', async () => {
    const user = userEvent.setup()
    render(<AdminPageInfo onUpdate={vi.fn()} page={makePage({ accessMode: 'public' })} />)

    expect(screen.getByText('Visible by direct link and eligible for the homepage directory.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Access mode'), 'password')
    expect(screen.getByText('Protected by a family-managed password and excluded from the homepage directory.')).toBeInTheDocument()
    expect(screen.getByText(/Protected memorials keep media behind signed access and require a current password to enter\./)).toBeInTheDocument()
  })

  it('falls back to default error message when failure body is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad payload', { status: 500 }))
    const user = userEvent.setup()

    render(
      <AdminPageInfo
        onUpdate={vi.fn()}
        page={makePage({ id: 'page-8', full_name: 'Jane' })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Unable to save memorial details.')).toBeInTheDocument()
  })

  it('disables submit and shows saving state while request is pending', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    const user = userEvent.setup()
    render(
      <AdminPageInfo
        onUpdate={vi.fn()}
        page={makePage({ id: 'page-10', full_name: null })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()

    if (resolveFetch) {
      resolveFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }
    expect(await screen.findByRole('button', { name: 'Save Changes' })).not.toBeDisabled()
  })

  it('submits memorial and qr configuration changes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const user = userEvent.setup()

    render(<AdminPageInfo onUpdate={vi.fn()} page={makePage({ id: 'page-11' })} />)

    await user.selectOptions(screen.getByLabelText('Theme Preset'), 'editorial')
    await user.selectOptions(screen.getByLabelText('Video Layout'), 'featured')
    await user.selectOptions(screen.getByLabelText('Slideshow'), 'disabled')
    await user.selectOptions(screen.getByLabelText('Photo Fit'), 'contain')
    await user.selectOptions(screen.getByLabelText('Caption Style'), 'minimal')
    await user.selectOptions(screen.getByLabelText('QR Template'), 'warm')
    await user.clear(screen.getByLabelText('QR Caption'))
    await user.type(screen.getByLabelText('QR Caption'), 'Visit tribute')
    await user.selectOptions(screen.getByLabelText('QR Foreground Color'), '#14532d')
    await user.selectOptions(screen.getByLabelText('QR Background Color'), '#fffaf2')
    await user.selectOptions(screen.getByLabelText('QR Frame Style'), 'double')
    await user.selectOptions(screen.getByLabelText('QR Caption Font'), 'sans')
    await user.selectOptions(screen.getByLabelText('QR Monogram'), 'enabled')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      memorialTheme: 'editorial',
      memorialVideoLayout: 'featured',
      memorialSlideshowEnabled: false,
      memorialSlideshowIntervalMs: 4500,
      memorialPhotoFit: 'contain',
      memorialCaptionStyle: 'minimal',
      qrTemplate: 'warm',
      qrCaption: expect.stringContaining('Visit tribute'),
      qrForegroundColor: '#14532d',
      qrBackgroundColor: '#fffaf2',
      qrFrameStyle: 'double',
      qrCaptionFont: 'sans',
      qrShowLogo: true,
    })
  })
})
