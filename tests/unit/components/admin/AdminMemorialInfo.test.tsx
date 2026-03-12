import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminMemorialInfo } from '@/components/admin/AdminMemorialInfo'

type AdminPageProps = React.ComponentProps<typeof AdminMemorialInfo>['memorial']

function makePage(overrides: Partial<AdminPageProps> = {}): AdminPageProps {
  return {
    id: 'page-1',
    title: 'Sample',
    slug: 'sample',
    full_name: 'Jane Doe',
    dedicationText: 'Beloved by family and parish.',
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

describe('AdminMemorialInfo', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resets form values when memorial prop changes', async () => {
    const onUpdate = vi.fn()
    const { rerender } = render(
      <AdminMemorialInfo
        onUpdate={onUpdate}
        memorial={makePage({ title: 'First Title', slug: 'first-title' })}
      />
    )

    const user = userEvent.setup()
    const titleInput = screen.getByLabelText('Memorial Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited Locally')
    expect(titleInput).toHaveValue('Edited Locally')

    rerender(
      <AdminMemorialInfo
        onUpdate={onUpdate}
        memorial={makePage({
          title: 'Server Updated Title',
          slug: 'first-title',
        })}
      />
    )

    expect(screen.getByLabelText('Memorial Title')).toHaveValue(
      'Server Updated Title'
    )
  })

  it('submits updates in password mode and clears password on success', async () => {
    const onUpdate = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={onUpdate}
        memorial={makePage({ id: 'page-9', full_name: null })}
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
      dedicationText: 'Beloved by family and parish.',
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Slug already exists.' }), {
        status: 409,
      })
    )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({
          id: 'page-7',
          full_name: 'Jane',
          accessMode: 'private',
        })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Slug already exists.')).toBeInTheDocument()
  })

  it('updates access guidance when access mode changes', async () => {
    const user = userEvent.setup()
    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ accessMode: 'public' })}
      />
    )

    expect(
      screen.getByText(
        'Visible by direct link and eligible for the homepage directory.'
      )
    ).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Access mode'), 'password')
    expect(
      screen.getByText(
        'Protected by a family-managed password and excluded from the homepage directory.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Protected memorials keep media behind signed access and require a current password to enter\./
      )
    ).toBeInTheDocument()
  })

  it('renders private access guidance when the memorial starts in private mode', () => {
    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ accessMode: 'private' })}
      />
    )

    expect(screen.getByText('private Mode')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Hidden from public visitors and excluded from the homepage directory.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Visitors without admin access will not be able to open the memorial\./
      )
    ).toBeInTheDocument()
  })

  it('submits edited dedication text', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ id: 'page-12', dedicationText: null })}
      />
    )

    await user.type(
      screen.getByLabelText('Dedication Text'),
      'A life of quiet service and steadfast love.'
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      dedicationText: 'A life of quiet service and steadfast love.',
    })
  })

  it('falls back to default error message when failure body is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad payload', { status: 500 })
    )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ id: 'page-8', full_name: 'Jane' })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(
      await screen.findByText('Unable to save memorial details.')
    ).toBeInTheDocument()
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
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ id: 'page-10', full_name: null })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()

    if (resolveFetch) {
      resolveFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }
    expect(
      await screen.findByRole('button', { name: 'Save Changes' })
    ).not.toBeDisabled()
  })

  it('submits memorial and qr configuration changes', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ id: 'page-11' })}
      />
    )

    fireEvent.change(screen.getByLabelText('Theme Preset'), {
      target: { value: 'editorial' },
    })
    fireEvent.change(screen.getByLabelText('Video Layout'), {
      target: { value: 'featured' },
    })
    fireEvent.change(screen.getByLabelText('Slideshow'), {
      target: { value: 'disabled' },
    })
    fireEvent.change(screen.getByLabelText('Photo Fit'), {
      target: { value: 'contain' },
    })
    fireEvent.change(screen.getByLabelText('Caption Style'), {
      target: { value: 'minimal' },
    })
    fireEvent.change(screen.getByLabelText('QR Template'), {
      target: { value: 'warm' },
    })
    fireEvent.change(screen.getByLabelText('QR Caption'), {
      target: { value: 'Visit tribute' },
    })
    fireEvent.change(screen.getByLabelText('QR Foreground Color'), {
      target: { value: '#14532d' },
    })
    fireEvent.change(screen.getByLabelText('QR Background Color'), {
      target: { value: '#fffaf2' },
    })
    fireEvent.change(screen.getByLabelText('QR Frame Style'), {
      target: { value: 'double' },
    })
    fireEvent.change(screen.getByLabelText('QR Caption Font'), {
      target: { value: 'sans' },
    })
    fireEvent.change(screen.getByLabelText('QR Monogram'), {
      target: { value: 'enabled' },
    })
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
  }, 30000)

  it('submits date fields and falls back to the default slideshow interval when cleared', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({ id: 'page-13', dob: null, dod: null })}
      />
    )

    const dobInput = screen.getByLabelText('DOB')
    const dodInput = screen.getByLabelText('DOD')

    fireEvent.input(dobInput, {
      target: { value: '1945-01-01' },
    })
    fireEvent.input(dodInput, {
      target: { value: '2025-01-01' },
    })
    fireEvent.change(screen.getByLabelText('Slideshow Interval (ms)'), {
      target: { value: '' },
    })

    expect(dobInput).toHaveValue('1945-01-01')
    expect(dodInput).toHaveValue('2025-01-01')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      dob: '1945-01-01',
      dod: '2025-01-01',
      memorialSlideshowIntervalMs: 4500,
    })
  }, 30000)

  it('uses default memorial and qr settings when optional props are omitted', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    const user = userEvent.setup()

    render(
      <AdminMemorialInfo
        onUpdate={vi.fn()}
        memorial={makePage({
          id: 'page-14',
          memorial_theme: undefined,
          memorial_slideshow_enabled: undefined,
          memorial_slideshow_interval_ms: undefined,
          memorial_video_layout: undefined,
          memorial_photo_fit: undefined,
          memorial_caption_style: undefined,
          qr_template: undefined,
          qr_caption: undefined,
          qr_foreground_color: undefined,
          qr_background_color: undefined,
          qr_frame_style: undefined,
          qr_caption_font: undefined,
          qr_show_logo: undefined,
        })}
      />
    )

    expect(screen.getByLabelText('Theme Preset')).toHaveValue('classic')
    expect(screen.getByLabelText('Slideshow')).toHaveValue('enabled')
    expect(screen.getByLabelText('QR Caption')).toHaveValue('Scan me!')
    expect(screen.getByLabelText('QR Monogram')).toHaveValue('disabled')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      memorialTheme: 'classic',
      memorialSlideshowEnabled: true,
      memorialSlideshowIntervalMs: 4500,
      memorialVideoLayout: 'grid',
      memorialPhotoFit: 'cover',
      memorialCaptionStyle: 'classic',
      qrTemplate: 'classic',
      qrCaption: 'Scan me!',
      qrForegroundColor: '#111827',
      qrBackgroundColor: '#ffffff',
      qrFrameStyle: 'line',
      qrCaptionFont: 'serif',
      qrShowLogo: false,
    })
  })
})
