import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserManagementScreen } from '@/components/pages/admin/UserManagementScreen'

describe('UserManagementScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and displays users', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          users: [
            {
              id: 'u1',
              full_name: 'Alex Santos',
              role: 'editor',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    )

    render(<UserManagementScreen />)

    expect(await screen.findByText('User Management')).toBeInTheDocument()
    expect(await screen.findByText('Alex Santos')).toBeInTheDocument()
  })

  it('invites a new user', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            user: {
              id: 'u2',
              full_name: 'Maria Reyes',
              role: 'viewer',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          }),
          { status: 201 }
        )
      }

      return new Response(JSON.stringify({ users: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    await screen.findByText('Invite New User')
    await user.type(screen.getByPlaceholderText('name@example.com'), 'maria@example.com')
    await user.type(screen.getByPlaceholderText('Alex Santos'), 'Maria Reyes')
    await user.selectOptions(screen.getByLabelText('Invite role'), 'viewer')
    await user.click(screen.getByRole('button', { name: /invite/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByText('Maria Reyes')).toBeInTheDocument()
  })

  it('filters users and updates role', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              { id: 'u1', full_name: 'Alex Santos', role: 'editor', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
              { id: 'u2', full_name: 'Maria Reyes', role: 'viewer', is_active: false, created_at: '2026-01-02T00:00:00.000Z' },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1' && init?.method === 'PATCH') {
        return new Response(
          JSON.stringify({
            user: { id: 'u1', full_name: 'Alex Santos', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)

    expect(await screen.findByText('Alex Santos')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search users or roles'), 'maria')
    expect(screen.getByText('Maria Reyes')).toBeInTheDocument()
    expect(screen.queryByText('Alex Santos')).not.toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText('Search users or roles'))
    await user.selectOptions(screen.getByLabelText('Role for Alex Santos'), 'admin')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(await screen.findByLabelText('Role for Alex Santos')).toHaveValue('admin')
  })

  it('respects deactivate confirmation and handles update errors', async () => {
    const confirmMock = vi.spyOn(window, 'confirm')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/users' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            users: [
              { id: 'u1', full_name: 'Alex Santos', role: 'editor', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/users/u1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'Deactivate failed' }), { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<UserManagementScreen />)
    await screen.findByText('Alex Santos')

    confirmMock.mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: 'Deactivate Alex Santos' }))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/admin/users/u1', expect.objectContaining({ method: 'DELETE' }))

    confirmMock.mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Deactivate Alex Santos' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/u1', expect.objectContaining({ method: 'DELETE' }))
    expect(await screen.findByText('Deactivate failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate Alex Santos' })).toBeInTheDocument()
  })
})
