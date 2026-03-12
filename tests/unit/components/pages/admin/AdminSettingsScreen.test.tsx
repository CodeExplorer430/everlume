import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSettingsScreen } from '@/components/pages/admin/AdminSettingsScreen'

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

describe('AdminSettingsScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the initial loading shell before redirects resolve', async () => {
    const redirectsRequest = deferredResponse()

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return redirectsRequest.promise
      }
      return new Response(
        JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
        { status: 200 }
      )
    })

    render(<AdminSettingsScreen />)

    expect(screen.getByText('Loading short links...')).toBeInTheDocument()

    redirectsRequest.resolve(
      new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    )
    expect(await screen.findByText('Short URL Management')).toBeInTheDocument()
  })

  it('loads redirects and site settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: true } }),
          { status: 200 }
        )
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
    expect(
      screen.getAllByRole('button', { name: 'Enabled' }).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('keeps default site-setting values when the site-settings fetch is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response('unavailable', { status: 503 })
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    render(<AdminSettingsScreen />)

    await screen.findByText('Short URL Management')
    expect(screen.getByText('Protected media v1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enabled' })).toBeInTheDocument()
    expect(screen.getByLabelText('Video Layout')).toHaveValue('grid')
    expect(screen.getByLabelText('Notice Title')).toHaveValue(
      'Media Viewing Notice'
    )
  })

  it('shows error when creating redirect fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/redirects' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({ message: 'Unable to create redirect from API' }),
            { status: 500 }
          )
        }
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    fireEvent.change(screen.getByPlaceholderText('grandma'), {
      target: { value: 'abc' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'),
      {
        target: { value: 'https://example.com' },
      }
    )
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects',
      expect.objectContaining({ method: 'POST' })
    )
    expect(
      await screen.findByText('Unable to create redirect from API')
    ).toBeInTheDocument()
  }, 30000)

  it('shows the create pending state and falls back when redirect creation fails with a non-json body', async () => {
    const createRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects' && init?.method === 'POST') {
        return createRequest.promise
      }
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    fireEvent.change(screen.getByPlaceholderText('grandma'), {
      target: { value: 'abc' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'),
      {
        target: { value: 'https://example.com' },
      }
    )
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()

    createRequest.resolve(new Response('bad', { status: 500 }))

    expect(
      await screen.findByText('Unable to create redirect.')
    ).toBeInTheDocument()
  })

  it('shows a redirect load error and retries successfully', async () => {
    let redirectsAttempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects') {
        redirectsAttempts += 1
        if (redirectsAttempts === 1) {
          return new Response(
            JSON.stringify({ message: 'Redirects unavailable.' }),
            { status: 503 }
          )
        }
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    expect(
      await screen.findByText('Redirects unavailable.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No redirects created.')).toBeInTheDocument()
  })

  it('rolls back homepage directory toggle when API update fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/redirects') {
          return new Response(JSON.stringify({ redirects: [] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/site-settings' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ message: 'Update failed' }), {
            status: 500,
          })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    expect(
      await screen.findByRole('button', { name: 'Disabled' })
    ).toBeInTheDocument()
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
        return new Response(
          JSON.stringify({ message: 'Slideshow update failed' }),
          { status: 500 }
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    const presentationSection = screen
      .getByText('Memorial Presentation Defaults')
      .closest('section') as HTMLElement
    await user.click(
      within(presentationSection).getByRole('button', { name: 'Enabled' })
    )

    expect(
      await screen.findByText('Slideshow update failed')
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Enabled' }).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('renders disabled slideshow defaults and featured video layout from site settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          settings: {
            homeDirectoryEnabled: false,
            memorialSlideshowEnabled: false,
            memorialSlideshowIntervalMs: 6000,
            memorialVideoLayout: 'featured',
          },
        }),
        { status: 200 }
      )
    })

    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    const presentationSection = screen
      .getByText('Memorial Presentation Defaults')
      .closest('section') as HTMLElement

    expect(
      within(presentationSection).getByRole('button', { name: 'Disabled' })
    ).toBeInTheDocument()
    expect(
      within(presentationSection).getByLabelText('Video Layout')
    ).toHaveValue('featured')
    expect(
      within(presentationSection).getByLabelText(
        'Slideshow Interval (milliseconds)'
      )
    ).toHaveValue(6000)
  })

  it('updates redirect status and rolls back delete when API fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: true } }),
            { status: 200 }
          )
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
          const body = JSON.parse(String(init.body)) as {
            printStatus?: string
            isActive?: boolean
          }
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
          return new Response(JSON.stringify({ message: 'Update failed' }), {
            status: 500,
          })
        }
        if (url === '/api/admin/redirects/r1' && init?.method === 'DELETE') {
          return new Response(JSON.stringify({ message: 'Delete failed' }), {
            status: 500,
          })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    await user.click(
      screen.getByRole('button', { name: 'Mark redirect sample as verified' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByText('Verified')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Delete redirect sample' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByText('/sample')).toBeInTheDocument()
  })

  it('disables the redirect row actions while verification is in flight', async () => {
    const updateRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects') {
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r1',
                shortcode: 'sample',
                target_url: 'https://example.com/memorials/sample',
                print_status: 'verified',
                last_verified_at: '2026-03-07T00:00:00.000Z',
                is_active: true,
                created_at: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects/r1' && init?.method === 'PATCH') {
        return updateRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    const verifyButton = screen.getByRole('button', {
      name: 'Mark redirect sample as unverified',
    })
    await user.click(verifyButton)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Disable redirect sample' })
      ).toBeDisabled()
    })
    expect(
      screen.getByRole('button', { name: 'Mark redirect sample as verified' })
    ).toBeDisabled()

    updateRequest.resolve(
      new Response(
        JSON.stringify({
          redirect: {
            id: 'r1',
            shortcode: 'sample',
            target_url: 'https://example.com/memorials/sample',
            print_status: 'unverified',
            last_verified_at: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        }),
        { status: 200 }
      )
    )

    expect(await screen.findByText('Unverified')).toBeInTheDocument()
  })

  it('removes the redirect row optimistically while delete is in flight', async () => {
    const deleteRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
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
      if (url === '/api/admin/redirects/r1' && init?.method === 'DELETE') {
        return deleteRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    const deleteButton = screen.getByRole('button', {
      name: 'Delete redirect sample',
    })
    await user.click(deleteButton)

    expect(screen.queryByText('/sample')).not.toBeInTheDocument()

    deleteRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    await waitFor(() => {
      expect(screen.queryByText('/sample')).not.toBeInTheDocument()
    })
  })

  it('ignores a second redirect delete while another delete is already pending', async () => {
    const deleteRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
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
                {
                  id: 'r2',
                  shortcode: 'second',
                  target_url: 'https://example.com/memorials/second',
                  print_status: 'unverified',
                  last_verified_at: null,
                  is_active: true,
                  created_at: '2026-01-02T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/redirects/r1' && init?.method === 'DELETE') {
          return deleteRequest.promise
        }
        if (url === '/api/admin/redirects/r2' && init?.method === 'DELETE') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    await user.click(
      screen.getByRole('button', { name: 'Delete redirect sample' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Delete redirect second' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/redirects/r2',
      expect.objectContaining({ method: 'DELETE' })
    )

    deleteRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    await waitFor(() => {
      expect(screen.queryByText('/sample')).not.toBeInTheDocument()
      expect(screen.getByText('/second')).toBeInTheDocument()
    })
  })

  it('keeps the optimistic redirect toggle when the API responds without a redirect payload', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
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

    await user.click(
      screen.getByRole('button', { name: 'Disable redirect toggle-me' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r4',
      expect.objectContaining({ method: 'PATCH' })
    )
    const redirectsTable = screen.getByRole('table')
    expect(
      await within(redirectsTable).findByText('Disabled')
    ).toBeInTheDocument()
  })

  it('shows the fallback error when updating a redirect fails with a non-json response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects') {
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r5',
                shortcode: 'fallback',
                target_url: 'https://example.com/memorials/fallback',
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
      if (url === '/api/admin/redirects/r5' && init?.method === 'PATCH') {
        return new Response('bad', { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/fallback')

    await user.click(
      screen.getByRole('button', { name: 'Disable redirect fallback' })
    )

    expect(
      await screen.findByText('Unable to update redirect.')
    ).toBeInTheDocument()
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })

  it('clears a prior delete error after a successful retry', async () => {
    let deleteAttempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects') {
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r6',
                shortcode: 'retry-delete',
                target_url: 'https://example.com/memorials/retry-delete',
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
      if (url === '/api/admin/redirects/r6' && init?.method === 'DELETE') {
        deleteAttempts += 1
        if (deleteAttempts === 1) {
          return new Response('bad', { status: 500 })
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/retry-delete')

    await user.click(
      screen.getByRole('button', { name: 'Delete redirect retry-delete' })
    )
    expect(
      await screen.findByText('Unable to delete redirect.')
    ).toBeInTheDocument()
    expect(screen.getByText('/retry-delete')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Delete redirect retry-delete' })
    )

    expect(screen.queryByText('/retry-delete')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Unable to delete redirect.')
    ).not.toBeInTheDocument()
  })

  it('saves memorial presentation settings', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
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
    await user.type(
      screen.getByLabelText('Slideshow Interval (milliseconds)'),
      '6000'
    )
    await user.click(
      screen.getByRole('button', { name: 'Save Memorial Presentation' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"memorialVideoLayout":"featured"'),
      })
    )
  })

  it('normalizes unexpected video layout values back to grid before saving', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              settings: {
                homeDirectoryEnabled: false,
                memorialSlideshowEnabled: true,
                memorialSlideshowIntervalMs: 4500,
                memorialVideoLayout: 'featured',
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
    const videoLayoutSelect = screen.getByLabelText('Video Layout')

    await user.selectOptions(videoLayoutSelect, 'grid')
    await waitFor(() => {
      expect(videoLayoutSelect).toHaveValue('grid')
    })
    await user.click(
      screen.getByRole('button', { name: 'Save Memorial Presentation' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"memorialVideoLayout":"grid"'),
      })
    )
  })

  it('clamps slideshow interval before saving', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
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
    await user.type(
      screen.getByLabelText('Slideshow Interval (milliseconds)'),
      '1500'
    )
    await user.click(
      screen.getByRole('button', { name: 'Save Memorial Presentation' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/site-settings',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"memorialSlideshowIntervalMs":2000'),
      })
    )
  })

  it('restores the clamped memorial interval when saving fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
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
        return new Response(
          JSON.stringify({ message: 'Unable to save defaults.' }),
          {
            status: 500,
          }
        )
      }
      return new Response(JSON.stringify({ redirects: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Memorial Presentation Defaults')
    const intervalInput = screen.getByLabelText(
      'Slideshow Interval (milliseconds)'
    )
    const videoLayoutSelect = screen.getByLabelText('Video Layout')

    await user.selectOptions(videoLayoutSelect, 'featured')
    await user.clear(intervalInput)
    await user.type(intervalInput, '1500')
    await user.click(
      screen.getByRole('button', { name: 'Save Memorial Presentation' })
    )

    expect(
      await screen.findByText('Unable to save defaults.')
    ).toBeInTheDocument()
    expect(intervalInput).toHaveValue(1500)
    expect(videoLayoutSelect).toHaveValue('featured')
  })

  it('creates a redirect and prepends it to the table when the API returns a redirect payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
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
    fireEvent.change(screen.getByPlaceholderText('grandma'), {
      target: { value: 'grandma' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'),
      {
        target: { value: 'https://example.com/memorials/grandma' },
      }
    )
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(await screen.findByText('/grandma')).toBeInTheDocument()
  })

  it('reloads redirects when create succeeds without returning a redirect payload', async () => {
    let redirectsCalls = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/redirects' && (!init || !init.method)) {
          redirectsCalls += 1
          if (redirectsCalls === 1) {
            return new Response(JSON.stringify({ redirects: [] }), {
              status: 200,
            })
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
    fireEvent.change(screen.getByPlaceholderText('grandma'), {
      target: { value: 'legacy' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('https://yourdomain.com/memorials/sample'),
      {
        target: { value: 'https://example.com/memorials/legacy' },
      }
    )
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('/legacy')).toBeInTheDocument()
  })

  it('clears a prior create error after a later successful create that reloads redirects', async () => {
    let createAttempts = 0
    let redirectsCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects' && (!init || !init.method)) {
        redirectsCalls += 1
        if (redirectsCalls === 1) {
          return new Response(JSON.stringify({ redirects: [] }), {
            status: 200,
          })
        }
        return new Response(
          JSON.stringify({
            redirects: [
              {
                id: 'r-success',
                shortcode: 'after-error',
                target_url: 'https://example.com/memorials/after-error',
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
        createAttempts += 1
        if (createAttempts === 1) {
          return new Response(
            JSON.stringify({ message: 'Create failed once' }),
            {
              status: 500,
            }
          )
        }
        return new Response(JSON.stringify({}), { status: 201 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Create New Redirect')
    const shortcodeInput = screen.getByPlaceholderText('grandma')
    const targetUrlInput = screen.getByPlaceholderText(
      'https://yourdomain.com/memorials/sample'
    )

    fireEvent.change(shortcodeInput, {
      target: { value: 'after-error' },
    })
    fireEvent.change(targetUrlInput, {
      target: { value: 'https://example.com/memorials/after-error' },
    })
    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(await screen.findByText('Create failed once')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create Redirect' }))

    expect(await screen.findByText('/after-error')).toBeInTheDocument()
    expect(screen.queryByText('Create failed once')).not.toBeInTheDocument()
  })

  it('ignores a second redirect update while another row update is already pending', async () => {
    const updateRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/site-settings') {
          return new Response(
            JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
            { status: 200 }
          )
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
                {
                  id: 'r2',
                  shortcode: 'second',
                  target_url: 'https://example.com/memorials/second',
                  print_status: 'unverified',
                  last_verified_at: null,
                  is_active: true,
                  created_at: '2026-01-02T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/redirects/r1' && init?.method === 'PATCH') {
          return updateRequest.promise
        }
        if (url === '/api/admin/redirects/r2' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    await user.click(
      screen.getByRole('button', { name: 'Disable redirect sample' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Disable redirect second' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/redirects/r1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/redirects/r2',
      expect.objectContaining({ method: 'PATCH' })
    )

    updateRequest.resolve(new Response(JSON.stringify({}), { status: 200 }))

    await waitFor(() => {
      expect(screen.getByText('/sample')).toBeInTheDocument()
      expect(screen.getByText('/second')).toBeInTheDocument()
    })
  })

  it('replaces only the updated redirect when a patch response returns a redirect payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/site-settings') {
        return new Response(
          JSON.stringify({ settings: { homeDirectoryEnabled: false } }),
          { status: 200 }
        )
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
              {
                id: 'r2',
                shortcode: 'second',
                target_url: 'https://example.com/memorials/second',
                print_status: 'unverified',
                last_verified_at: null,
                is_active: true,
                created_at: '2026-01-02T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/redirects/r1' && init?.method === 'PATCH') {
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
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)
    await screen.findByText('/sample')

    await user.click(
      screen.getByRole('button', { name: 'Mark redirect sample as verified' })
    )

    const rows = screen.getAllByRole('row')
    expect(await screen.findByText('Verified')).toBeInTheDocument()
    expect(rows.some((row) => row.textContent?.includes('/second'))).toBe(true)
    expect(rows.some((row) => row.textContent?.includes('Unverified'))).toBe(
      true
    )
  })

  it('loads protected media consent settings and saves a new notice version', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/redirects') {
          return new Response(JSON.stringify({ redirects: [] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/site-settings' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              settings: {
                homeDirectoryEnabled: false,
                protectedMediaConsentTitle: 'Family Media Notice',
                protectedMediaConsentBody:
                  'Original protected media consent body for the memorial family.',
                protectedMediaConsentVersion: 4,
              },
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    expect(await screen.findByText('Current version 4')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Notice Title'))
    await user.type(
      screen.getByLabelText('Notice Title'),
      'Updated Family Notice'
    )
    await user.clear(screen.getByLabelText('Notice Body'))
    await user.type(
      screen.getByLabelText('Notice Body'),
      'Updated protected media consent body for family memorial visitors and invited guests.'
    )
    await user.click(
      screen.getByRole('button', { name: 'Save and Publish New Version' })
    )

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/admin/site-settings' && init?.method === 'PATCH'
    )
    expect(patchCall).toBeTruthy()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      protectedMediaConsentTitle: 'Updated Family Notice',
    })
  })

  it('keeps edited protected media copy visible when publishing a new version fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), {
          status: 200,
        })
      }
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            settings: {
              homeDirectoryEnabled: false,
              protectedMediaConsentTitle: 'Family Media Notice',
              protectedMediaConsentBody:
                'Original protected media consent body for the memorial family.',
              protectedMediaConsentVersion: 4,
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Publish failed.' }), {
          status: 500,
        })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    const titleInput = await screen.findByLabelText('Notice Title')
    const bodyInput = screen.getByLabelText('Notice Body')

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Family Notice')
    await user.clear(bodyInput)
    await user.type(
      bodyInput,
      'Updated protected media consent body for family memorial visitors and invited guests.'
    )
    await user.click(
      screen.getByRole('button', { name: 'Save and Publish New Version' })
    )

    expect(await screen.findByText('Publish failed.')).toBeInTheDocument()
    expect(titleInput).toHaveValue('Updated Family Notice')
    expect(bodyInput).toHaveValue(
      'Updated protected media consent body for family memorial visitors and invited guests.'
    )
    expect(screen.getByText('Current version 4')).toBeInTheDocument()
  })

  it('republishes the current protected media notice without changing the copy', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/redirects') {
          return new Response(JSON.stringify({ redirects: [] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/site-settings' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              settings: {
                homeDirectoryEnabled: false,
                protectedMediaConsentTitle: 'Media Viewing Notice',
                protectedMediaConsentBody:
                  'Protected media consent body for the memorial family and invited visitors.',
                protectedMediaConsentVersion: 2,
              },
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Current version 2')
    await user.click(
      screen.getByRole('button', { name: 'Republish Current Notice' })
    )

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/admin/site-settings' && init?.method === 'PATCH'
    )
    expect(patchCall).toBeTruthy()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      bumpProtectedMediaConsentVersion: true,
    })
  })

  it('rolls back the optimistic version bump when republishing fails', async () => {
    const publishRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/redirects') {
        return new Response(JSON.stringify({ redirects: [] }), {
          status: 200,
        })
      }
      if (url === '/api/admin/site-settings' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            settings: {
              homeDirectoryEnabled: false,
              protectedMediaConsentTitle: 'Media Viewing Notice',
              protectedMediaConsentBody:
                'Protected media consent body for the memorial family and invited visitors.',
              protectedMediaConsentVersion: 2,
            },
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/site-settings' && init?.method === 'PATCH') {
        return publishRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<AdminSettingsScreen />)

    await screen.findByText('Current version 2')
    await user.click(
      screen.getByRole('button', { name: 'Republish Current Notice' })
    )

    expect(screen.getByText('Current version 3')).toBeInTheDocument()

    publishRequest.resolve(
      new Response(JSON.stringify({ message: 'Republish failed.' }), {
        status: 500,
      })
    )

    expect(await screen.findByText('Republish failed.')).toBeInTheDocument()
    expect(screen.getByText('Current version 2')).toBeInTheDocument()
  })
})
