import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorialUnlockForm } from '@/components/public/MemorialUnlockForm'

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

describe('MemorialUnlockForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submits password and calls unlock endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid password' }), {
        status: 401,
      })
    )

    const user = userEvent.setup()
    render(<MemorialUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'family-password')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/memorials/jane/unlock',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'family-password' }),
        })
      )
    })

    expect(
      screen.getByText(
        /Protected memorials are shared by direct link and do not appear in the public directory\./
      )
    ).toBeInTheDocument()
  })

  it('shows error when unlock fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid password' }), {
        status: 401,
      })
    )

    const user = userEvent.setup()
    render(<MemorialUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid password'
    )
  })

  it('shows the fallback error when the unlock response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad', { status: 500 })
    )

    const user = userEvent.setup()
    render(<MemorialUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to unlock this memorial.'
    )
  })

  it('reloads the page after a successful unlock and clears the loading state only on response', async () => {
    const request = deferredResponse()
    const reloadMock = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => request.promise
    )
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    })

    try {
      const user = userEvent.setup()
      render(<MemorialUnlockForm slug="jane" />)

      await user.type(
        screen.getByLabelText('Access Password'),
        'family-password'
      )
      await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

      expect(
        screen.getByRole('button', { name: 'Unlocking...' })
      ).toBeDisabled()

      request.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled()
      })
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('shows loading state while unlock request is pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => {})
    )

    const user = userEvent.setup()
    render(<MemorialUnlockForm slug="jane" />)

    await user.type(screen.getByLabelText('Access Password'), 'family-password')
    await user.click(screen.getByRole('button', { name: 'Unlock Memorial' }))

    expect(screen.getByRole('button', { name: 'Unlocking...' })).toBeDisabled()
  })
})
