import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoManager } from '@/components/admin/VideoManager'

describe('VideoManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders policy notice and existing videos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ videos: [{ id: '1', provider_id: 'abcdefghijk', title: 'Clip' }] }), { status: 200 })
    )

    render(<VideoManager pageId="page-1" />)

    expect(await screen.findByText(/Upload videos to YouTube first/)).toBeInTheDocument()
    expect(await screen.findByText('Clip')).toBeInTheDocument()
  })

  it('inserts valid youtube video', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/videos' && init?.method === 'POST') {
        return new Response(JSON.stringify({ video: { id: 'new' } }), { status: 201 })
      }

      return new Response(JSON.stringify({ videos: [{ id: '1', provider_id: 'abcdefghijk', title: 'Clip' }] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager pageId="page-1" />)

    await screen.findByText(/Upload videos to YouTube first/)
    await user.type(screen.getByPlaceholderText(/YouTube URL/), 'https://www.youtube.com/watch?v=abcdefghijk')
    await user.type(screen.getByPlaceholderText(/Video Title/), 'Memorial Video')
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/videos',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('shows load error when initial fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Videos unavailable.' }), { status: 503 }))

    render(<VideoManager pageId="page-2" />)

    expect(await screen.findByText('Videos unavailable.')).toBeInTheDocument()
  })

  it('shows fallback add error when add request fails with non-json body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/admin/videos' && init?.method === 'POST') {
        return new Response('bad', { status: 500 })
      }
      return new Response(JSON.stringify({ videos: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager pageId="page-3" />)

    await screen.findByText(/Upload videos to YouTube first/)
    await user.type(screen.getByPlaceholderText(/YouTube URL/), 'https://www.youtube.com/watch?v=abcdefghijk')
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(await screen.findByText('Unable to add video.')).toBeInTheDocument()
  })

  it('reloads list when add succeeds without returning a video payload', async () => {
    let getCount = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/pages/page-4/videos')) {
        getCount += 1
        if (getCount === 1) {
          return new Response(JSON.stringify({ videos: [] }), { status: 200 })
        }
        return new Response(JSON.stringify({ videos: [{ id: 'v9', provider_id: 'abcdefghijk', title: 'Reloaded Video' }] }), { status: 200 })
      }
      if (url === '/api/admin/videos' && init?.method === 'POST') {
        return new Response(JSON.stringify({}), { status: 201 })
      }
      return new Response(JSON.stringify({ videos: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager pageId="page-4" />)

    await screen.findByText(/Upload videos to YouTube first/)
    await user.type(screen.getByPlaceholderText(/YouTube URL/), 'https://www.youtube.com/watch?v=abcdefghijk')
    await user.type(screen.getByPlaceholderText(/Video Title/), 'Queued')
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(await screen.findByText('Reloaded Video')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/videos', expect.objectContaining({ method: 'POST' }))
  })

  it('restores deleted video and shows error when delete fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/pages/page-5/videos')) {
        return new Response(JSON.stringify({ videos: [{ id: '1', provider_id: 'abcdefghijk', title: 'Clip' }] }), { status: 200 })
      }
      if (url === '/api/admin/videos/1' && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'Cannot delete video.' }), { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager pageId="page-5" />)

    await screen.findByText('Clip')
    await user.click(screen.getByRole('button', { name: /delete video/i }))

    expect(await screen.findByText('Cannot delete video.')).toBeInTheDocument()
    expect(screen.getByText('Clip')).toBeInTheDocument()
  })
})
