import { render, screen } from '@testing-library/react'
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
    access_mode: 'public' as const,
    privacy: 'public' as const,
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
    const titleInput = screen.getByLabelText('Page Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited Locally')
    expect(titleInput).toHaveValue('Edited Locally')

    rerender(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={makePage({ title: 'Server Updated Title', slug: 'first-title' })}
      />
    )

    expect(screen.getByLabelText('Page Title')).toHaveValue('Server Updated Title')
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
      '/api/admin/pages/page-9',
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
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Set or Rotate Password')).toHaveValue('')
  })

  it('shows server error message when update fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Slug already exists.' }), { status: 409 }))
    const user = userEvent.setup()

    render(
      <AdminPageInfo
        onUpdate={vi.fn()}
        page={makePage({ id: 'page-7', full_name: 'Jane', access_mode: 'private', privacy: 'private' })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Slug already exists.')).toBeInTheDocument()
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
    expect(await screen.findByText('Unable to save page details.')).toBeInTheDocument()
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
})
