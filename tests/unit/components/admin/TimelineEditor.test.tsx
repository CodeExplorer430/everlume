import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineEditor } from '@/components/admin/TimelineEditor'

describe('TimelineEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders current timeline events', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events: [{ id: 't1', year: 1990, text: 'Born' }] }), { status: 200 })
    )

    render(<TimelineEditor memorialId="page-1" />)
    expect(await screen.findByText('Born')).toBeInTheDocument()
  })

  it('inserts event', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/timeline' && init?.method === 'POST') {
        return new Response(JSON.stringify({ event: { id: 'new' } }), { status: 201 })
      }

      return new Response(JSON.stringify({ events: [{ id: 't1', year: 1990, text: 'Born' }] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<TimelineEditor memorialId="page-1" />)

    await screen.findByText('Born')
    await user.type(screen.getByPlaceholderText('Year'), '2001')
    await user.type(screen.getByPlaceholderText('Event description...'), 'Started university')
    await user.click(screen.getByRole('button', { name: /add timeline event/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/timeline',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('shows load error when initial fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Timeline unavailable.' }), { status: 503 }))

    render(<TimelineEditor memorialId="page-2" />)
    expect(await screen.findByText('Timeline unavailable.')).toBeInTheDocument()
  })

  it('shows fallback error when add fails with non-json payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/timeline' && init?.method === 'POST') {
        return new Response('bad', { status: 500 })
      }
      return new Response(JSON.stringify({ events: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<TimelineEditor memorialId="page-3" />)

    await screen.findByPlaceholderText('Event description...')
    await user.type(screen.getByPlaceholderText('Year'), '2001')
    await user.type(screen.getByPlaceholderText('Event description...'), 'Test event')
    await user.click(screen.getByRole('button', { name: /add timeline event/i }))

    expect(await screen.findByText('Unable to add timeline event.')).toBeInTheDocument()
  })

  it('restores event and shows error when delete fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-4/timeline')) {
        return new Response(JSON.stringify({ events: [{ id: 't1', year: 1990, text: 'Born' }] }), { status: 200 })
      }
      if (url === '/api/admin/timeline/t1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'Cannot delete event.' }), { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<TimelineEditor memorialId="page-4" />)

    await screen.findByText('Born')
    await user.click(screen.getByRole('button', { name: /delete timeline event/i }))

    expect(await screen.findByText('Cannot delete event.')).toBeInTheDocument()
    expect(screen.getByText('Born')).toBeInTheDocument()
  })

  it('reloads list when add succeeds without event payload', async () => {
    let getCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-5/timeline')) {
        getCount += 1
        if (getCount === 1) {
          return new Response(JSON.stringify({ events: [] }), { status: 200 })
        }
        return new Response(JSON.stringify({ events: [{ id: 't2', year: 2001, text: 'Started school' }] }), { status: 200 })
      }
      if (url === '/api/admin/timeline' && init?.method === 'POST') {
        return new Response(JSON.stringify({}), { status: 201 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<TimelineEditor memorialId="page-5" />)

    await screen.findByPlaceholderText('Event description...')
    await user.type(screen.getByPlaceholderText('Year'), '2001')
    await user.type(screen.getByPlaceholderText('Event description...'), 'Started school')
    await user.click(screen.getByRole('button', { name: /add timeline event/i }))

    expect(await screen.findByText('Started school')).toBeInTheDocument()
  })
})
