import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuestbookModerationScreen } from '@/components/pages/admin/GuestbookModerationScreen'

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

const sampleEntry = {
  id: 'entry-1',
  name: 'Ana',
  message: 'Forever remembered',
  is_approved: false,
  created_at: '2026-02-14T00:00:00.000Z',
  pages: { title: 'Lola Maria' },
}

describe('GuestbookModerationScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads entries and approves an entry', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/guestbook' && (!init || !init.method)) {
          return new Response(JSON.stringify({ entries: [sampleEntry] }), {
            status: 200,
          })
        }
        if (
          url === '/api/admin/guestbook/entry-1/approve' &&
          init?.method === 'POST'
        ) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)

    expect(await screen.findByText('Forever remembered')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/guestbook/entry-1/approve',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Approved Ana for public display.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Already visible on the public memorial guestbook.')
    ).toBeInTheDocument()
  })

  it('uses the generic success label when approving an entry without a display name', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            entries: [{ ...sampleEntry, name: '' }],
          }),
          { status: 200 }
        )
      }
      if (
        url === '/api/admin/guestbook/entry-1/approve' &&
        init?.method === 'POST'
      ) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Delete guestbook entry from',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from' })
    )

    expect(
      await screen.findByText('Approved guestbook entry for public display.')
    ).toBeInTheDocument()
  })

  it('shows load error and retries successfully', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unable to load from API' }), {
          status: 500,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      )

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)

    expect(
      await screen.findByText('Unable to load from API')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Forever remembered')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back to the default load error when the moderation response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad', { status: 500 })
    )

    render(<GuestbookModerationScreen />)

    expect(
      await screen.findByText('Unable to load guestbook entries.')
    ).toBeInTheDocument()
  })

  it('shows the loading state before the moderation queue resolves', async () => {
    const request = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => request.promise
    )

    render(<GuestbookModerationScreen />)

    expect(screen.getByText('Loading entries...')).toBeInTheDocument()

    request.resolve(
      new Response(
        JSON.stringify({ entries: [{ ...sampleEntry, pages: null }] }),
        {
          status: 200,
        }
      )
    )

    expect(await screen.findByText('Forever remembered')).toBeInTheDocument()
    expect(screen.getByText('Untitled memorial')).toBeInTheDocument()
  })

  it('rolls back optimistic approve when API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      }
      if (
        url === '/api/admin/guestbook/entry-1/approve' &&
        init?.method === 'POST'
      ) {
        return new Response(JSON.stringify({ message: 'Approval failed' }), {
          status: 500,
        })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )

    expect(await screen.findByText('Approval failed')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('falls back to the default approve error when the API response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      }
      if (
        url === '/api/admin/guestbook/entry-1/approve' &&
        init?.method === 'POST'
      ) {
        return new Response('bad', { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )

    expect(
      await screen.findByText('Unable to approve entry.')
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('respects delete confirmation before calling API', async () => {
    const confirmMock = vi.spyOn(window, 'confirm')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/guestbook' && (!init || !init.method)) {
          return new Response(JSON.stringify({ entries: [sampleEntry] }), {
            status: 200,
          })
        }
        if (
          url === '/api/admin/guestbook/entry-1' &&
          init?.method === 'DELETE'
        ) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    confirmMock.mockReturnValueOnce(false)
    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/guestbook/entry-1',
      expect.objectContaining({ method: 'DELETE' })
    )

    confirmMock.mockReturnValueOnce(true)
    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/guestbook/entry-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('rolls back unapprove when the API rejects the change', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({ entries: [{ ...sampleEntry, is_approved: true }] }),
          { status: 200 }
        )
      }
      if (
        url === '/api/admin/guestbook/entry-1/unapprove' &&
        init?.method === 'POST'
      ) {
        return new Response(JSON.stringify({ message: 'Unapprove failed' }), {
          status: 500,
        })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Unapprove guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from Ana' })
    )

    expect(await screen.findByText('Unapprove failed')).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
  })

  it('falls back to the default unapprove error when the API response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({ entries: [{ ...sampleEntry, is_approved: true }] }),
          { status: 200 }
        )
      }
      if (
        url === '/api/admin/guestbook/entry-1/unapprove' &&
        init?.method === 'POST'
      ) {
        return new Response('bad', { status: 500 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Unapprove guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from Ana' })
    )

    expect(
      await screen.findByText('Unable to unapprove entry.')
    ).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
  })

  it('unapproves an approved entry and reports the success state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/guestbook' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              entries: [{ ...sampleEntry, is_approved: true }],
            }),
            { status: 200 }
          )
        }
        if (
          url === '/api/admin/guestbook/entry-1/unapprove' &&
          init?.method === 'POST'
        ) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Unapprove guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/guestbook/entry-1/unapprove',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Moved Ana back to pending review.')
    ).toBeInTheDocument()
  })

  it('uses the generic success label when unapproving an entry without a display name', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            entries: [{ ...sampleEntry, name: '', is_approved: true }],
          }),
          { status: 200 }
        )
      }
      if (
        url === '/api/admin/guestbook/entry-1/unapprove' &&
        init?.method === 'POST'
      ) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Unapprove guestbook entry from',
    })

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from' })
    )

    expect(
      await screen.findByText('Moved guestbook entry back to pending review.')
    ).toBeInTheDocument()
  })

  it('disables unapprove and delete while an unapprove request is in flight', async () => {
    const unapproveRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            entries: [{ ...sampleEntry, is_approved: true }],
          }),
          { status: 200 }
        )
      }
      if (
        url === '/api/admin/guestbook/entry-1/unapprove' &&
        init?.method === 'POST'
      ) {
        return unapproveRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Unapprove guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Approve guestbook entry from Ana',
        })
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
      ).toBeDisabled()
    })

    unapproveRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    expect(
      await screen.findByText('Moved Ana back to pending review.')
    ).toBeInTheDocument()
  })

  it('clears a prior success banner when a new moderation action starts', async () => {
    const unapproveRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      }
      if (
        url === '/api/admin/guestbook/entry-1/approve' &&
        init?.method === 'POST'
      ) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      if (
        url === '/api/admin/guestbook/entry-1/unapprove' &&
        init?.method === 'POST'
      ) {
        return unapproveRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )
    expect(
      await screen.findByText('Approved Ana for public display.')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Unapprove guestbook entry from Ana' })
    )

    expect(
      screen.queryByText('Approved Ana for public display.')
    ).not.toBeInTheDocument()

    unapproveRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    expect(
      await screen.findByText('Moved Ana back to pending review.')
    ).toBeInTheDocument()
  })

  it('shows the delete fallback error for non-json failures, then clears it after a successful retry', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    let deleteAttempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      }
      if (url === '/api/admin/guestbook/entry-1' && init?.method === 'DELETE') {
        deleteAttempts += 1
        if (deleteAttempts === 1) {
          return new Response('bad', { status: 500 })
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Delete guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
    )
    expect(
      await screen.findByText('Unable to delete entry.')
    ).toBeInTheDocument()
    expect(screen.getByText('Forever remembered')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Unable to delete entry.')
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Forever remembered')).not.toBeInTheDocument()
    })
    expect(confirmMock).toHaveBeenCalledTimes(2)
    expect(
      screen.getByText('Deleted Ana from the moderation queue.')
    ).toBeInTheDocument()
  })

  it('uses the generic success label when deleting an entry without a display name', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(
          JSON.stringify({
            entries: [{ ...sampleEntry, name: '' }],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/guestbook/entry-1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Delete guestbook entry from',
    })

    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from' })
    )

    expect(
      await screen.findByText(
        'Deleted guestbook entry from the moderation queue.'
      )
    ).toBeInTheDocument()
  })

  it('ignores a second delete while another delete is already pending', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const deleteRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/guestbook' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              entries: [
                sampleEntry,
                { ...sampleEntry, id: 'entry-2', name: 'Bea' },
              ],
            }),
            { status: 200 }
          )
        }
        if (
          url === '/api/admin/guestbook/entry-1' &&
          init?.method === 'DELETE'
        ) {
          return deleteRequest.promise
        }
        if (
          url === '/api/admin/guestbook/entry-2' &&
          init?.method === 'DELETE'
        ) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Delete guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Delete guestbook entry from Bea' })
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/guestbook/entry-1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/guestbook/entry-2',
      expect.objectContaining({ method: 'DELETE' })
    )

    deleteRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    expect(
      await screen.findByText('Deleted Ana from the moderation queue.')
    ).toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
  })

  it('ignores a second moderation action while another request is still pending', async () => {
    const approveRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/guestbook' && (!init || !init.method)) {
          return new Response(
            JSON.stringify({
              entries: [
                sampleEntry,
                { ...sampleEntry, id: 'entry-2', name: 'Bea' },
              ],
            }),
            { status: 200 }
          )
        }
        if (
          url === '/api/admin/guestbook/entry-1/approve' &&
          init?.method === 'POST'
        ) {
          return approveRequest.promise
        }
        if (
          url === '/api/admin/guestbook/entry-2/approve' &&
          init?.method === 'POST'
        ) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Bea' })
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('button', { name: 'Approve guestbook entry from Bea' })
    ).toBeEnabled()

    approveRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    expect(
      await screen.findByText('Approved Ana for public display.')
    ).toBeInTheDocument()
  })

  it('disables the approval action while an approve request is in flight', async () => {
    const approveRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/guestbook' && (!init || !init.method)) {
        return new Response(JSON.stringify({ entries: [sampleEntry] }), {
          status: 200,
        })
      }
      if (
        url === '/api/admin/guestbook/entry-1/approve' &&
        init?.method === 'POST'
      ) {
        return approveRequest.promise
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const user = userEvent.setup()
    render(<GuestbookModerationScreen />)
    await screen.findByRole('button', {
      name: 'Approve guestbook entry from Ana',
    })

    await user.click(
      screen.getByRole('button', { name: 'Approve guestbook entry from Ana' })
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Unapprove guestbook entry from Ana',
        })
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Delete guestbook entry from Ana' })
      ).toBeDisabled()
    })

    approveRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    expect(
      await screen.findByText('Approved Ana for public display.')
    ).toBeInTheDocument()
  })

  it('treats an omitted entries payload as an empty moderation queue', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    render(<GuestbookModerationScreen />)

    expect(
      await screen.findByText(/No guestbook entries need review right now/i)
    ).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(3)
  })

  it('renders the empty state when there are no guestbook entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ entries: [] }), { status: 200 })
    )

    render(<GuestbookModerationScreen />)

    expect(
      await screen.findByText(/No guestbook entries need review right now/i)
    ).toBeInTheDocument()
  })
})
