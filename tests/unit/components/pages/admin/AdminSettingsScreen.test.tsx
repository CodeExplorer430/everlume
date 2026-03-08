import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSettingsScreen } from '@/components/pages/admin/AdminSettingsScreen'

describe('AdminSettingsScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads redirects and site settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: true } }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          redirects: [
            {
              id: 'r1',
              shortcode: 'sample',
              target_url: 'https://example.com/memorials/sample',
              print_status: 'unverified',
              last_verified_at: null,
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    })

    render(<AdminSettingsScreen />)

    expect(await screen.findByText('Short URL Management')).toBeInTheDocument()
    expect(await screen.findByText('/sample')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Enabled' }).length).toBeGreaterThanOrEqual(1)
  })

  it('shows error when creating redirect fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects' && init?.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Unable to create redirect from API' }), { status: 500 })
      }
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    await user.type(screen.getByPlaceholderText('grandma'), 'abc')
    await user.type(screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'), 'https://example.com')
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('Unable to create redirect from API')).toBeInTheDocument()
  })

  it('shows a redirect load error and retries successfully', async () => {
    let redirectsAttempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      if (url === '/api/admin/redirects') {
        redirectsAttempts += 1
        if (redirectsAttempts === 1) {
          return new Response(JSON.stringify({ message: 'Redirects unavailable.' }), { status: 503 })
        }
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    expect(await screen.findByText('Redirects unavailable.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No redirects created.')).toBeInTheDocument()
  })

  it('rolls back homepage directory toggle when API update fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Update failed' }), { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    expect(await screen.findByRole('button', { name: 'Disabled' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Disabled' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByText('Update failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeInTheDocument()
  })

  it('rolls back memorial slideshow toggle when API update fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            settings: { homeDirectoryEnabled: false, memorialSlideshowEnabled: true, memorialSlideshowIntervalMs: 4500, memorialVideoLayout: 'grid' },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Slideshow update failed' }), { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    const presentationSection = screen.getByText('Memorial Presentation Defaults').closest('section') as HTMLElement
    await user.click(within(presentationSection).getByRole('button', { name: 'Enabled' }))

    expect(await screen.findByText('Slideshow update failed')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Enabled' }).length).toBeGreaterThanOrEqual(1)
  })

  it('updates redirect status and rolls back delete when API fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: true } }), { status: 200 })
      }
      if (url === '/api/admin/redirects') {
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r1',
                shortcode: 'sample',
                target_url: 'https://example.com/memorials/sample',
                print_status: 'unverified',
                last_verified_at: null,
                is_active: true,
                created_at: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects/r1' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { printStatus?: string; isActive?: boolean }
        if (body.printStatus === 'verified') {
          return new Response(
            JSON.stringify({
              redirect: {
                id: 'r1',
                shortcode: 'sample',
                target_url: 'https://example.com/memorials/sample',
                print_status: 'verified',
                last_verified_at: '2026-03-07T00:00:00.000Z',
                is_active: true,
                created_at: '2026-01-01T00:00:00.000Z',
              },
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ message: 'Update failed' }), { status: 500 })
      }
      if (url === '/api/admin/redirects/r1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'Delete failed' }), { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    await user.click(screen.getByRole('button', { name: 'Mark redirect sample as verified' }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByText('Verified')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete redirect sample' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/redirects/r1', expect.objectContaining({ method: 'DELETE' }))
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByText('/sample')).toBeInTheDocument()
  })

  it('keeps the optimistic redirect toggle when the API responds without a redirect payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      if (url === '/api/admin/redirects') {
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r4',
                shortcode: 'toggle-me',
                target_url: 'https://example.com/memorials/toggle-me',
                print_status: 'unverified',
                last_verified_at: null,
                is_active: true,
                created_at: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects/r4' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({}), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/toggle-me')

    await user.click(screen.getByRole('button', { name: 'Disable redirect toggle-me' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/redirects/r4', expect.objectContaining({ method: 'PATCH' }))
    const redirectsTable = screen.getByRole('table')
    expect(await within(redirectsTable).findByText('Disabled')).toBeInTheDocument()
  })

  it('saves memorial presentation settings', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            settings: {
              homeDirectoryEnabled: true,
              memorialSlideshowEnabled: true,
              memorialSlideshowIntervalMs: 5000,
              memorialVideoLayout: 'grid',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    await user.selectOptions(screen.getByLabelText('Video Layout'), 'featured')
    await user.clear(screen.getByLabelText('Slideshow Interval (milliseconds)'))
    await user.type(screen.getByLabelText('Slideshow Interval (milliseconds)'), '6000')
    await user.click(screen.getByRole('button', { name: 'Save Memorial Presentation' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"memorialVideoLayout":"featured"'),
      })
    )
  })

  it('clamps slideshow interval before saving', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            settings: {
              homeDirectoryEnabled: false,
              memorialSlideshowEnabled: true,
              memorialSlideshowIntervalMs: 4500,
              memorialVideoLayout: 'grid',
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    await user.clear(screen.getByLabelText('Slideshow Interval (milliseconds)'))
    await user.type(screen.getByLabelText('Slideshow Interval (milliseconds)'), '1500')
    await user.click(screen.getByRole('button', { name: 'Save Memorial Presentation' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"memorialSlideshowIntervalMs":2000'),
      })
    )
  })

  it('creates a redirect and prepends it to the table when the API returns a redirect payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      if (url === '/api/admin/redirects' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            redirect: {
              id: 'r2',
              shortcode: 'grandma',
              target_url: 'https://example.com/memorials/grandma',
              print_status: 'unverified',
              last_verified_at: null,
              is_active: true,
              created_at: '2026-03-08T00:00:00.000Z',
            },
          }),
          { status: 201 }
        )
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    await user.type(screen.getByPlaceholderText('grandma'), 'grandma')
    await user.type(screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'), 'https://example.com/memorials/grandma')
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(await screen.findByText('/grandma')).toBeInTheDocument()
  })

  it('reloads redirects when create succeeds without returning a redirect payload', async () => {
    let redirectsCalls = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(JSON.stringify({ settings: { homeDirectoryEnabled: false } }), { status: 200 })
      }
      if (url === '/api/admin/redirects' && (!init || !init.method)) {
        redirectsCalls += 1
        if (redirectsCalls === 1) {
          return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
        }
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r3',
                shortcode: 'legacy',
                target_url: 'https://example.com/memorials/legacy',
                print_status: 'unverified',
                last_verified_at: null,
                is_active: true,
                created_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects' && init?.method === 'POST') {
        return new Response(JSON.stringify({}), { status: 201 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    await user.type(screen.getByPlaceholderText('grandma'), 'legacy')
    await user.type(screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'), 'https://example.com/memorials/legacy')
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/redirects', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByText('/legacy')).toBeInTheDocument()
  })
})
