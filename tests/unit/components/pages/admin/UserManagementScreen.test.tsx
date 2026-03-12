import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserManagementScreen } from '@/components/pages/admin/UserManagementScreen'

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    email: 'alex@example.com',
    full_name: 'Alex Santos',
    role: 'editor',
    is_active: true,
    account_state: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

describe('UserManagementScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the loading state before the initial user list resolves', async () => {
    const listRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => listRequest.promise
    )

    render(<UserManagementScreen />)

    expect(screen.getByText('Loading users...')).toBeInTheDocument()

    listRequest.resolve(
      new Response(JSON.stringify({ users: [makeUser()] }), { status: 200 })
    )

    expect(await screen.findByText('Alex Santos')).toBeInTheDocument()
  })

  it('loads and displays users with email addresses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ users: [makeUser()] }), { status: 200 })
    )

    render(<UserManagementScreen />)

    expect(await screen.findByText('User Management')).toBeInTheDocument()
    expect(await screen.findByText('Alex Santos')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
  })

  it('shows the inviting state and falls back to the default invite error for non-json failures', async () => {
    const inviteRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [] }), { status: 200 })
        }
        if (url === '/api/admin/users' && init?.method === 'POST') {
          return inviteRequest.promise
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Invite New User')
    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'maria@example.com'
    )
    await user.type(screen.getByPlaceholderText('Alex Santos'), 'Maria Reyes')
    await user.click(screen.getByRole('button', { name: /^invite$/i }))

    expect(screen.getByRole('button', { name: /Inviting/i })).toBeDisabled()

    inviteRequest.resolve(new Response('broken', { status: 500 }))

    expect(
      await screen.findByText('Unable to invite user.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows load errors and the empty-search state', async () => {
    let attempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempts += 1
      if (attempts === 1) {
        return new Response(
          JSON.stringify({ message: 'Unable to load users from API.' }),
          { status: 500 }
        )
      }
      return new Response(JSON.stringify({ users: [makeUser()] }), {
        status: 200,
      })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    expect(
      await screen.findByText('Unable to load users from API.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh list' }))
    await screen.findByText('Alex Santos')
    await user.type(
      screen.getByPlaceholderText('Search users, emails, or roles'),
      'nomatch'
    )
    expect(screen.getByText('No users match your search.')).toBeInTheDocument()
  })

  it('falls back to the default load error when the initial user response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('broken', { status: 500 })
    )

    render(<UserManagementScreen />)

    expect(await screen.findByText('Unable to load users.')).toBeInTheDocument()
  })

  it('treats a missing users payload as an empty list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    render(<UserManagementScreen />)

    expect(await screen.findByText('Invite New User')).toBeInTheDocument()
    expect(screen.getByText('No users match your search.')).toBeInTheDocument()
  })

  it('filters users safely when profile names or emails are missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          users: [
            makeUser({
              id: 'u1',
              email: null,
              full_name: null,
              role: 'viewer',
            }),
            makeUser({
              id: 'u2',
              email: 'maria@example.com',
              full_name: 'Maria Reyes',
              role: 'editor',
            }),
          ],
        }),
        { status: 200 }
      )
    )

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Maria Reyes')
    await user.type(
      screen.getByPlaceholderText('Search users, emails, or roles'),
      'maria'
    )

    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
    expect(screen.queryByText('Alex Santos')).not.toBeInTheDocument()
  })

  it('invites a new user', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              user: makeUser({
                id: 'u2',
                email: 'maria@example.com',
                full_name: 'Maria Reyes',
                role: 'viewer',
              }),
            }),
            { status: 201 }
          )
        }

        return new Response(JSON.stringify({ users: [] }), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Invite New User')
    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'maria@example.com'
    )
    await user.type(screen.getByPlaceholderText('Alex Santos'), 'Maria Reyes')
    await user.selectOptions(screen.getByLabelText('Invite role'), 'viewer')
    await user.click(screen.getByRole('button', { name: /^invite$/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' })
    )
    expect(
      await screen.findByText('Invitation email sent.')
    ).toBeInTheDocument()
    expect(await screen.findByText('Maria Reyes')).toBeInTheDocument()
  })

  it('reloads the list when an invite succeeds without returning a user payload', async () => {
    let listCalls = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          listCalls += 1
          if (listCalls === 1) {
            return new Response(JSON.stringify({ users: [] }), { status: 200 })
          }
          return new Response(
            JSON.stringify({
              users: [
                makeUser({
                  id: 'u2',
                  email: 'maria@example.com',
                  full_name: 'Maria Reyes',
                  account_state: 'invited',
                }),
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users' && init?.method === 'POST') {
          return new Response(JSON.stringify({}), { status: 201 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Invite New User')
    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'maria@example.com'
    )
    await user.type(screen.getByPlaceholderText('Alex Santos'), 'Maria Reyes')
    await user.click(screen.getByRole('button', { name: /^invite$/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('Maria Reyes')).toBeInTheDocument()
  })

  it('filters users and updates role', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              users: [
                makeUser(),
                makeUser({
                  id: 'u2',
                  email: 'maria@example.com',
                  full_name: 'Maria Reyes',
                  role: 'viewer',
                  is_active: false,
                  account_state: 'deactivated',
                  created_at: '2026-01-02T00:00:00.000Z',
                }),
                makeUser({
                  id: 'u3',
                  email: 'pending@example.com',
                  full_name: 'Pending User',
                  role: 'viewer',
                  account_state: 'invited',
                  created_at: '2026-01-03T00:00:00.000Z',
                }),
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
          return new Response(
            JSON.stringify({ user: makeUser({ role: 'admin' }) }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    expect(await screen.findByText('Alex Santos')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Pending Setup')).toBeInTheDocument()

    await user.type(
      screen.getByPlaceholderText('Search users, emails, or roles'),
      'maria'
    )
    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
    expect(screen.queryByText('Alex Santos')).not.toBeInTheDocument()

    await user.clear(
      screen.getByPlaceholderText('Search users, emails, or roles')
    )
    await user.selectOptions(
      screen.getByLabelText('Role for Alex Santos'),
      'admin'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByLabelText('Role for Alex Santos')).toHaveValue(
      'admin'
    )
  })

  it('reloads the list when a user update succeeds without returning a user payload', async () => {
    let listCalls = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          listCalls += 1
          if (listCalls === 1) {
            return new Response(JSON.stringify({ users: [makeUser()] }), {
              status: 200,
            })
          }
          return new Response(
            JSON.stringify({ users: [makeUser({ role: 'admin' })] }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
          return new Response(JSON.stringify({ shouldSignOutSelf: false }), {
            status: 200,
          })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Alex Santos')
    await user.selectOptions(
      screen.getByLabelText('Role for Alex Santos'),
      'admin'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByLabelText('Role for Alex Santos')).toHaveValue(
      'admin'
    )
  })

  it('shows the fallback update error and blocks other actions while an update is pending', async () => {
    const patchRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [makeUser()] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
          return patchRequest.promise
        }
        if (
          url === '/api/admin/users/u1/reset-password' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({ message: 'should not happen' }),
            {
              status: 200,
            }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Alex Santos')
    await user.selectOptions(
      screen.getByLabelText('Role for Alex Santos'),
      'admin'
    )

    expect(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/users/u1/reset-password',
      expect.objectContaining({ method: 'POST' })
    )

    patchRequest.resolve(new Response('broken', { status: 500 }))

    expect(
      await screen.findByText('Unable to update user.')
    ).toBeInTheDocument()
  })

  it('signs the current browser out when an update response requests self sign-out', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [makeUser()] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
          return new Response(
            JSON.stringify({ shouldSignOutSelf: true, user: makeUser() }),
            { status: 200 }
          )
        }
        if (url === '/auth/signout' && init?.method === 'POST') {
          return new Response(null, { status: 302 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.selectOptions(
      screen.getByLabelText('Role for Alex Santos'),
      'admin'
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/auth/signout',
        expect.objectContaining({ method: 'POST', redirect: 'manual' })
      )
    })
  })

  it('resends invites and sends password resets', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({ users: [makeUser({ account_state: 'invited' })] }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users/u1/invite' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              user: makeUser({
                invited_at: '2026-03-08T00:00:00.000Z',
                account_state: 'invited',
              }),
              message: 'Invite email sent.',
            }),
            { status: 200 }
          )
        }
        if (
          url === '/api/admin/users/u1/reset-password' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({ message: 'Password reset email sent.' }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Resend invite to Alex Santos' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1/invite',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('Invite email sent.')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1/reset-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(
      await screen.findByText('Password reset email sent.')
    ).toBeInTheDocument()
  })

  it('uses default success messages when invite resend and password reset omit them', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({ users: [makeUser({ account_state: 'invited' })] }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users/u1/invite' && init?.method === 'POST') {
          return new Response(JSON.stringify({}), { status: 200 })
        }
        if (
          url === '/api/admin/users/u1/reset-password' &&
          init?.method === 'POST'
        ) {
          return new Response(JSON.stringify({}), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Resend invite to Alex Santos' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1/invite',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('Invite email sent.')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1/reset-password',
      expect.objectContaining({ method: 'POST' })
    )
    expect(
      await screen.findByText('Password reset email sent.')
    ).toBeInTheDocument()
  })

  it('shows invite and reset errors without dropping user lifecycle state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              makeUser({
                account_state: 'invited',
                invited_at: '2026-03-08T00:00:00.000Z',
              }),
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1/invite' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ message: 'Unable to resend invite.' }),
          { status: 500 }
        )
      }
      if (
        url === '/api/admin/users/u1/reset-password' &&
        init?.method === 'POST'
      ) {
        return new Response(
          JSON.stringify({ message: 'Unable to send password reset.' }),
          { status: 500 }
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Resend invite to Alex Santos' })
    )
    expect(
      await screen.findByText('Unable to resend invite.')
    ).toBeInTheDocument()
    expect(screen.getByText('Pending Setup')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    )
    expect(
      await screen.findByText('Unable to send password reset.')
    ).toBeInTheDocument()
    expect(screen.getByText('Pending Setup')).toBeInTheDocument()
  })

  it('shows fallback resend-invite and reset errors when responses are not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              makeUser({
                account_state: 'invited',
                invited_at: '2026-03-08T00:00:00.000Z',
              }),
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1/invite' && init?.method === 'POST') {
        return new Response('broken', { status: 500 })
      }
      if (
        url === '/api/admin/users/u1/reset-password' &&
        init?.method === 'POST'
      ) {
        return new Response('still broken', { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Resend invite to Alex Santos' })
    )
    expect(
      await screen.findByText('Unable to resend invite.')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Send password reset to Alex Santos' })
    )
    expect(
      await screen.findByText('Unable to send password reset.')
    ).toBeInTheDocument()
  })

  it('respects deactivate confirmation and handles deactivate errors', async () => {
    const confirmMock = vi.spyOn(window, 'confirm')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [makeUser()] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
          return new Response(
            JSON.stringify({ message: 'Deactivate failed' }),
            { status: 500 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    confirmMock.mockReturnValueOnce(false)
    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'DELETE' })
    )

    confirmMock.mockReturnValueOnce(true)
    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(await screen.findByText('Deactivate failed')).toBeInTheDocument()
  })

  it('falls back to the default deactivate error when the response is not json', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(JSON.stringify({ users: [makeUser()] }), {
          status: 200,
        })
      }
      if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
        return new Response('broken', { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )

    expect(confirmMock).toHaveBeenCalled()
    expect(
      await screen.findByText('Unable to deactivate user.')
    ).toBeInTheDocument()
  })

  it('reactivates inactive users and preserves the returned account state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              users: [
                makeUser({
                  is_active: false,
                  account_state: 'deactivated',
                  deactivated_at: '2026-03-08T00:00:00.000Z',
                }),
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
          return new Response(
            JSON.stringify({
              user: makeUser({
                is_active: true,
                account_state: 'invited',
                invited_at: '2026-03-08T00:00:00.000Z',
              }),
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Reactivate Alex Santos' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(
      await screen.findByText('Account status updated.')
    ).toBeInTheDocument()
    expect(screen.getByText('Pending Setup')).toBeInTheDocument()
  })

  it('uses the local deactivate fallback when the api returns no updated user', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [makeUser()] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
          return new Response(JSON.stringify({}), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )

    expect(confirmMock).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(await screen.findByText('User deactivated.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reactivate Alex Santos' })
    ).toBeInTheDocument()
  })

  it('preserves unrelated users when the local deactivate fallback is used', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              makeUser(),
              makeUser({
                id: 'u2',
                email: 'maria@example.com',
                full_name: 'Maria Reyes',
              }),
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({}), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Maria Reyes')

    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )

    expect(confirmMock).toHaveBeenCalled()
    expect(await screen.findByText('User deactivated.')).toBeInTheDocument()
    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
  })

  it('preserves unrelated users when deactivation returns an updated user payload', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              makeUser(),
              makeUser({
                id: 'u2',
                email: 'maria@example.com',
                full_name: 'Maria Reyes',
              }),
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
        return new Response(
          JSON.stringify({
            user: makeUser({
              is_active: false,
              account_state: 'deactivated',
              deactivated_at: '2026-03-08T00:00:00.000Z',
            }),
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Maria Reyes')

    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )

    expect(confirmMock).toHaveBeenCalled()
    expect(await screen.findByText('User deactivated.')).toBeInTheDocument()
    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
  })

  it('updates only the invited user when resend invite returns a user payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              makeUser({
                account_state: 'invited',
                invited_at: '2026-03-01T00:00:00.000Z',
              }),
              makeUser({
                id: 'u2',
                email: 'maria@example.com',
                full_name: 'Maria Reyes',
              }),
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1/invite' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            user: makeUser({
              account_state: 'invited',
              invited_at: '2026-03-09T00:00:00.000Z',
            }),
            message: 'Invite email sent.',
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Maria Reyes')

    await user.click(
      screen.getByRole('button', { name: 'Resend invite to Alex Santos' })
    )

    expect(await screen.findByText('Invite email sent.')).toBeInTheDocument()
    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
  })

  it('signs the current browser out after self-deactivation', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/users' && (!init || !init.method)) {
          return new Response(JSON.stringify({ users: [makeUser()] }), {
            status: 200,
          })
        }
        if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
          return new Response(
            JSON.stringify({
              ok: true,
              shouldSignOutSelf: true,
              user: makeUser({
                is_active: false,
                account_state: 'deactivated',
                deactivated_at: '2026-03-08T00:00:00.000Z',
              }),
            }),
            { status: 200 }
          )
        }
        if (url === '/auth/signout' && init?.method === 'POST') {
          return new Response(null, { status: 302 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })
    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    await user.click(
      screen.getByRole('button', { name: 'Deactivate Alex Santos' })
    )

    expect(confirmMock).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/signout',
      expect.objectContaining({ method: 'POST', redirect: 'manual' })
    )
  })
})
