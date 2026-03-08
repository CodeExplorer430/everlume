import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageUnlockForm } from '@/components/public/PageUnlockForm'

describe('PageUnlockForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits password and calls unlock endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid password' }), { status: 401 }))

    const user = userEvent.setup()
    render(<PageUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'family-password')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/pages/jane/unlock',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'family-password' }),
        })
      )
    })

    expect(screen.getByText(/Protected memorials are shared by direct link and do not appear in the public directory\./)).toBeInTheDocument()
  })

  it('shows error when unlock fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid password' }), { status: 401 }))

    const user = userEvent.setup()
    render(<PageUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password')
  })

  it('shows loading state while unlock request is pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => {})
    )

    const user = userEvent.setup()
    render(<PageUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'family-password')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    expect(screen.getByRole('button', { name: 'Unlocking...' })).toBeDisabled()
  })
})
