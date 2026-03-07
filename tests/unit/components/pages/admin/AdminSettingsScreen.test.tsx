import { render, screen } from '@testing-library/react'
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
    expect(await screen.findByText('/r/sample')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enabled' })).toBeInTheDocument()
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
    await screen.findByText('/r/sample')

    await user.click(screen.getByRole('button', { name: 'Mark redirect sample as verified' }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByText('Verified')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete redirect sample' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/redirects/r1', expect.objectContaining({ method: 'DELETE' }))
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByText('/r/sample')).toBeInTheDocument()
  })
})
