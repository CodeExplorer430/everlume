import { act, render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoManager } from '@/components/admin/VideoManager'

function deferredResponse() {
  let resolve: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

describe('VideoManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders policy notice and existing videos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          videos: [
            {
              id: '1',
              provider: 'youtube',
              provider_id: 'abcdefghijk',
              title: 'Clip',
            },
          ],
        }),
        { status: 200 }
      )
    )

    render(<VideoManager memorialId="page-1" />)

    expect(
      await screen.findByText(/Large videos can now be uploaded/)
    ).toBeInTheDocument()
    expect(await screen.findByText('Clip')).toBeInTheDocument()
  })

  it('inserts valid youtube video', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url === '/api/admin/videos' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              video: {
                id: 'new',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'Clip',
              },
            }),
            { status: 201 }
          )
        }

        return new Response(
          JSON.stringify({
            videos: [
              {
                id: '1',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'Clip',
              },
            ],
          }),
          { status: 200 }
        )
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-1" />)

    await screen.findByText(/Large videos can now be uploaded/)
    fireEvent.change(screen.getByPlaceholderText(/YouTube URL/), {
      target: { value: 'https://www.youtube.com/watch?v=abcdefghijk' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Video Title/), {
      target: { value: 'Memorial Video' },
    })
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/videos',
      expect.objectContaining({
        method: 'POST',
      })
    )
  }, 30000)

  it('shows load error when initial fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Videos unavailable.' }), {
        status: 503,
      })
    )

    render(<VideoManager memorialId="page-2" />)

    expect(await screen.findByText('Videos unavailable.')).toBeInTheDocument()
  })

  it('falls back to the default load error when the initial response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad', { status: 500 })
    )

    render(<VideoManager memorialId="page-2b" />)

    expect(
      await screen.findByText('Unable to load videos.')
    ).toBeInTheDocument()
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
    render(<VideoManager memorialId="page-3" />)

    await screen.findByText(/Large videos can now be uploaded/)
    fireEvent.change(screen.getByPlaceholderText(/YouTube URL/), {
      target: { value: 'https://www.youtube.com/watch?v=abcdefghijk' },
    })
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(await screen.findByText('Unable to add video.')).toBeInTheDocument()
  })

  it('reloads list when add succeeds without returning a video payload', async () => {
    let getCount = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.includes('/api/admin/memorials/page-4/videos')) {
          getCount += 1
          if (getCount === 1) {
            return new Response(JSON.stringify({ videos: [] }), { status: 200 })
          }
          return new Response(
            JSON.stringify({
              videos: [
                {
                  id: 'v9',
                  provider: 'youtube',
                  provider_id: 'abcdefghijk',
                  title: 'Reloaded Video',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/videos' && init?.method === 'POST') {
          return new Response(JSON.stringify({}), { status: 201 })
        }
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-4" />)

    await screen.findByText(/Large videos can now be uploaded/)
    fireEvent.change(screen.getByPlaceholderText(/YouTube URL/), {
      target: { value: 'https://www.youtube.com/watch?v=abcdefghijk' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Video Title/), {
      target: { value: 'Queued' },
    })
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(await screen.findByText('Reloaded Video')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/videos',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('restores deleted video and shows error when delete fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-5/videos')) {
        return new Response(
          JSON.stringify({
            videos: [
              {
                id: '1',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'Clip',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/videos/1' && init?.method === 'DELETE') {
        return new Response(
          JSON.stringify({ message: 'Cannot delete video.' }),
          { status: 500 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-5" />)

    await screen.findByText('Clip')
    await user.click(screen.getByRole('button', { name: /delete video/i }))

    expect(await screen.findByText('Cannot delete video.')).toBeInTheDocument()
    expect(screen.getByText('Clip')).toBeInTheDocument()
  })

  it('shows the fallback delete error when delete fails with a non-json body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-5b/videos')) {
        return new Response(
          JSON.stringify({
            videos: [
              {
                id: '1',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'Clip',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/videos/1' && init?.method === 'DELETE') {
        return new Response('bad', { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-5b" />)

    await screen.findByText('Clip')
    await user.click(screen.getByRole('button', { name: /delete video/i }))

    expect(
      await screen.findByText('Unable to delete video.')
    ).toBeInTheDocument()
    expect(screen.getByText('Clip')).toBeInTheDocument()
  })

  it('shows fallback guidance when compression cannot reach free-tier size', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-6/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440000')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              status: 'fallback_required',
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-6" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    expect(fileInput).toBeTruthy()
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        /Video still exceeds the 100MB Cloudinary limit/,
        {},
        { timeout: 6000 }
      )
    ).toBeInTheDocument()
  })

  it('keeps upload-and-process button disabled until a file is selected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ videos: [] }), { status: 200 })
    )
    render(<VideoManager memorialId="page-7" />)

    await screen.findByText(/Large videos can now be uploaded/)
    expect(
      screen.getByRole('button', { name: /upload and process video/i })
    ).toBeDisabled()
  })

  it('renders fallback labels for videos without a title or known provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          videos: [
            {
              id: 'null-provider',
              provider: null,
              provider_id: 'providerless',
              title: null,
            },
          ],
        }),
        { status: 200 }
      )
    )

    render(<VideoManager memorialId="page-7b" />)

    expect(await screen.findByText('Untitled Video')).toBeInTheDocument()
    expect(screen.getByText('YouTube ID: providerless')).toBeInTheDocument()
  })

  it('falls back to an empty video list when the load response omits videos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    render(<VideoManager memorialId="page-7c" />)

    expect(
      await screen.findByText(/Large videos can now be uploaded/)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/delete video/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Untitled Video')).not.toBeInTheDocument()
  })

  it('clears the selected file when the file input is reset', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ videos: [] }), { status: 200 })
    )

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-7c" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const button = screen.getByRole('button', {
      name: /upload and process video/i,
    })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })

    await user.upload(fileInput, file)
    expect(button).toBeEnabled()

    fireEvent.change(fileInput, { target: { files: [] } })
    expect(button).toBeDisabled()
  })

  it('shows an error when upload init fails before the file is uploaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-8/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Init failed.' }), {
          status: 500,
        })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-8" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(await screen.findByText('Init failed.')).toBeInTheDocument()
  })

  it('shows an error when the upload init payload is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-8b/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(JSON.stringify({ job: { status: 'uploading' } }), {
          status: 201,
        })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-8b" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Upload job response was invalid.')
    ).toBeInTheDocument()
  })

  it('shows an error when the upload succeeds but the start step fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-9/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Start failed.' }), {
          status: 500,
        })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-9" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(await screen.findByText('Start failed.')).toBeInTheDocument()
  })

  it('shows an error when the browser upload fails before processing starts', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-9b/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440013',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-9b" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('File upload failed before compression started.')
    ).toBeInTheDocument()
  })

  it('surfaces attach failures after a completed processing job', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440011',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440011')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440011',
              status: 'completed',
            },
          }),
          { status: 200 }
        )
      }
      if (url.endsWith('/attach') && init?.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Attach failed.' }), {
          status: 500,
        })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Attach failed.', {}, { timeout: 4000 })
    ).toBeInTheDocument()
  })

  it('shows the fallback attach error when attach fails with a non-json body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10a/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440027',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440027')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440027',
              status: 'completed',
            },
          }),
          { status: 200 }
        )
      }
      if (url.endsWith('/attach') && init?.method === 'POST') {
        return new Response('bad', { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10a" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        'Unable to attach processed video.',
        {},
        {
          timeout: 4000,
        }
      )
    ).toBeInTheDocument()
  })

  it('shows the fallback poll error when the status response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10b/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440021',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440021')) {
        return new Response('bad', { status: 500 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10b" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        'Unable to check video processing status.',
        {},
        {
          timeout: 4000,
        }
      )
    ).toBeInTheDocument()
  })

  it('shows an invalid-job error when the poll response succeeds without a job payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10b2/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440026',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440026')) {
        return new Response(JSON.stringify({}), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10b2" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        'Upload job response was invalid.',
        {},
        {
          timeout: 4000,
        }
      )
    ).toBeInTheDocument()
  })

  it('shows the processing error message from a failed job', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10c/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440022',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440022')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440022',
              status: 'failed',
              error_message: 'Cloudinary transcoding failed.',
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10c" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        'Cloudinary transcoding failed.',
        {},
        {
          timeout: 4000,
        }
      )
    ).toBeInTheDocument()
  })

  it('shows the generic failed-job guidance when no processing error message is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10d/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440023',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440023')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440023',
              status: 'failed',
              error_message: null,
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10d" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText(
        'Video processing failed. Please try again or use YouTube Unlisted.',
        {},
        { timeout: 4000 }
      )
    ).toBeInTheDocument()
  })

  it('appends a completed processed video without reloading and clears upload inputs', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.includes('/api/admin/memorials/page-10e/videos')) {
          return new Response(JSON.stringify({ videos: [] }), { status: 200 })
        }
        if (
          url === '/api/admin/videos/uploads/init' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440024',
                status: 'uploading',
                uploadUrl: 'https://upload.test/video.mp4',
              },
            }),
            { status: 201 }
          )
        }
        if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
          return new Response(null, { status: 200 })
        }
        if (url.endsWith('/start') && init?.method === 'POST') {
          return new Response(JSON.stringify({ ok: true }), { status: 202 })
        }
        if (url.endsWith('/550e8400-e29b-41d4-a716-446655440024')) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440024',
                status: 'completed',
              },
            }),
            { status: 200 }
          )
        }
        if (url.endsWith('/attach') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              video: {
                id: 'cloud-2',
                provider: 'cloudinary',
                provider_id: 'everlume/demo-clip',
                title: 'Processed clip',
              },
            }),
            { status: 200 }
          )
        }
        return new Response('{}', { status: 200 })
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10e" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const titleInput = screen.getByPlaceholderText(/Uploaded File Title/i)

    await user.upload(fileInput, file)
    await user.type(titleInput, 'Tribute upload')
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Processed clip', {}, { timeout: 4000 })
    ).toBeInTheDocument()
    expect(titleInput).toHaveValue('')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /upload and process video/i })
      ).toBeDisabled()
    })
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('/api/admin/memorials/page-10e/videos')
      )
    ).toHaveLength(1)
  })

  it('reloads the list when attach succeeds without returning a video payload', async () => {
    let fetchVideosCount = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.includes('/api/admin/memorials/page-10e2/videos')) {
          fetchVideosCount += 1
          if (fetchVideosCount === 1) {
            return new Response(JSON.stringify({ videos: [] }), { status: 200 })
          }
          return new Response(
            JSON.stringify({
              videos: [
                {
                  id: 'cloud-3',
                  provider: 'cloudinary',
                  provider_id: 'everlume/reloaded',
                  title: 'Reloaded processed clip',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (
          url === '/api/admin/videos/uploads/init' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440028',
                status: 'uploading',
                uploadUrl: 'https://upload.test/video.mp4',
              },
            }),
            { status: 201 }
          )
        }
        if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
          return new Response(null, { status: 200 })
        }
        if (url.endsWith('/start') && init?.method === 'POST') {
          return new Response(JSON.stringify({ ok: true }), { status: 202 })
        }
        if (url.endsWith('/550e8400-e29b-41d4-a716-446655440028')) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440028',
                status: 'completed',
              },
            }),
            { status: 200 }
          )
        }
        if (url.endsWith('/attach') && init?.method === 'POST') {
          return new Response(JSON.stringify({}), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10e2" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const titleInput = screen.getByPlaceholderText(/Uploaded File Title/i)

    await user.upload(fileInput, file)
    await user.type(titleInput, 'Queued upload')
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Reloaded processed clip', {}, { timeout: 4000 })
    ).toBeInTheDocument()
    expect(titleInput).toHaveValue('')
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('/api/admin/memorials/page-10e2/videos')
      )
    ).toHaveLength(2)
  })

  it('times out when processing never leaves the queued states', async () => {
    vi.useFakeTimers()

    let statusChecks = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10f/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440025',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440025')) {
        statusChecks += 1
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440025',
              status: statusChecks % 2 === 0 ? 'processing' : 'queued',
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    try {
      render(<VideoManager memorialId="page-10f" />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      const file = new File(['video-bytes'], 'tribute.mp4', {
        type: 'video/mp4',
      })
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      fireEvent.change(fileInput, { target: { files: [file] } })

      const form = screen
        .getByText('Upload and Compress (100MB Cloudinary Free Tier)')
        .closest('form') as HTMLFormElement

      await act(async () => {
        fireEvent.submit(form)
        await Promise.resolve()
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })

      expect(
        screen.getByText(
          'Processing timed out. Please refresh and check upload status.'
        )
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears prior delete errors after a successful retry', async () => {
    let deleteAttempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-10g/videos')) {
        return new Response(
          JSON.stringify({
            videos: [
              {
                id: '1',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'Clip',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/videos/1' && init?.method === 'DELETE') {
        deleteAttempts += 1
        if (deleteAttempts === 1) {
          return new Response(JSON.stringify({ message: 'Delete failed.' }), {
            status: 500,
          })
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-10g" />)

    await screen.findByText('Clip')
    await user.click(screen.getByRole('button', { name: /delete video/i }))
    expect(await screen.findByText('Delete failed.')).toBeInTheDocument()
    expect(screen.getByText('Clip')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete video/i }))

    await waitFor(() => {
      expect(screen.queryByText('Delete failed.')).not.toBeInTheDocument()
      expect(screen.queryByText('Clip')).not.toBeInTheDocument()
    })
  })

  it('reloads the list when the processing job is already attached', async () => {
    let fetchVideosCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-11/videos')) {
        fetchVideosCount += 1
        if (fetchVideosCount === 1) {
          return new Response(JSON.stringify({ videos: [] }), { status: 200 })
        }
        return new Response(
          JSON.stringify({
            videos: [
              {
                id: 'cloud-1',
                provider: 'cloudinary',
                provider_id: 'everlume/demo',
                title: 'Processed clip',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440012',
              status: 'uploading',
              uploadUrl: 'https://upload.test/video.mp4',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/video.mp4' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), { status: 202 })
      }
      if (url.endsWith('/550e8400-e29b-41d4-a716-446655440012')) {
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440012',
              status: 'attached',
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-11" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Processed clip', {}, { timeout: 4000 })
    ).toBeInTheDocument()
  })

  it('asks for a file when the upload form is submitted without one', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ videos: [] }), { status: 200 })
    )
    render(<VideoManager memorialId="page-12" />)

    await screen.findByText(/Large videos can now be uploaded/)
    fireEvent.submit(
      screen
        .getByText('Upload and Compress (100MB Cloudinary Free Tier)')
        .closest('form') as HTMLFormElement
    )

    expect(
      await screen.findByText('Choose a video file first.')
    ).toBeInTheDocument()
  })

  it('uses fallback mime types for typeless file uploads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.includes('/api/admin/memorials/page-13/videos')) {
          return new Response(JSON.stringify({ videos: [] }), { status: 200 })
        }
        if (
          url === '/api/admin/videos/uploads/init' &&
          init?.method === 'POST'
        ) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440013',
                status: 'uploading',
                uploadUrl: 'https://upload.test/typeless-video',
              },
            }),
            { status: 201 }
          )
        }
        if (
          url === 'https://upload.test/typeless-video' &&
          (init?.method === 'PUT' || !init?.method)
        ) {
          return new Response(null, { status: 200 })
        }
        if (url.endsWith('/start') && init?.method === 'POST') {
          return new Response(JSON.stringify({ ok: true }), { status: 202 })
        }
        if (url.endsWith('/550e8400-e29b-41d4-a716-446655440013')) {
          return new Response(
            JSON.stringify({
              job: {
                id: '550e8400-e29b-41d4-a716-446655440013',
                status: 'attached',
              },
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-13" />)

    await screen.findByText(/Large videos can now be uploaded/)
    const file = new File(['video-bytes'], 'tribute.bin', { type: '' })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/videos/uploads/init',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    const initCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === '/api/admin/videos/uploads/init'
    )
    expect(initCall).toBeTruthy()
    expect(JSON.parse(String(initCall?.[1]?.body))).toMatchObject({
      mimeType: 'video/mp4',
    })

    const uploadCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === 'https://upload.test/typeless-video'
    )
    expect(uploadCall?.[1]).toMatchObject({
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  })

  it('shows fallback init and start errors when those responses are non-json', async () => {
    let stage: 'init' | 'start' = 'init'
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-14/videos')) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200 })
      }
      if (url === '/api/admin/videos/uploads/init' && init?.method === 'POST') {
        if (stage === 'init') {
          return new Response('bad-init', { status: 500 })
        }
        return new Response(
          JSON.stringify({
            job: {
              id: '550e8400-e29b-41d4-a716-446655440014',
              status: 'uploading',
              uploadUrl: 'https://upload.test/start-error',
            },
          }),
          { status: 201 }
        )
      }
      if (url === 'https://upload.test/start-error' && init?.method === 'PUT') {
        return new Response(null, { status: 200 })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        return new Response('bad-start', { status: 500 })
      }
      return new Response(JSON.stringify({ videos: [] }), { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-14" />)

    await screen.findByText(/Large videos can now be uploaded/)
    let fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    await user.upload(
      fileInput,
      new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    )
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Unable to initialize file upload.')
    ).toBeInTheDocument()

    stage = 'start'
    fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(
      fileInput,
      new File(['video-bytes'], 'tribute.mp4', { type: 'video/mp4' })
    )
    await user.click(
      screen.getByRole('button', { name: /upload and process video/i })
    )

    expect(
      await screen.findByText('Unable to start video processing.')
    ).toBeInTheDocument()
  })

  it('shows a row-level loader only for the video being deleted', async () => {
    const deleteRequest = deferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/memorials/page-15/videos')) {
        return new Response(
          JSON.stringify({
            videos: [
              {
                id: 'video-1',
                provider: 'youtube',
                provider_id: 'abcdefghijk',
                title: 'First clip',
              },
              {
                id: 'video-2',
                provider: 'cloudinary',
                provider_id: 'everlume/demo',
                title: 'Second clip',
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url === '/api/admin/videos/video-1' && init?.method === 'DELETE') {
        return deleteRequest.promise
      }
      return new Response('{}', { status: 200 })
    })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-15" />)

    await screen.findByText('First clip')
    const deleteButtons = screen.getAllByRole('button', {
      name: /delete video/i,
    })

    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('First clip')).not.toBeInTheDocument()
      expect(screen.getByText('Second clip')).toBeInTheDocument()
      expect(
        screen.getAllByRole('button', { name: /delete video/i })
      ).toHaveLength(1)
    })

    deleteRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    await waitFor(() => {
      expect(screen.queryByText('First clip')).not.toBeInTheDocument()
      expect(screen.getByText('Second clip')).toBeInTheDocument()
    })
  })

  it('ignores a second delete request while another video deletion is already pending', async () => {
    const deleteRequest = deferredResponse()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input)
        if (url.includes('/api/admin/memorials/page-15b/videos')) {
          return new Response(
            JSON.stringify({
              videos: [
                {
                  id: 'video-1',
                  provider: 'youtube',
                  provider_id: 'abcdefghijk',
                  title: 'First clip',
                },
                {
                  id: 'video-2',
                  provider: 'cloudinary',
                  provider_id: 'everlume/demo',
                  title: 'Second clip',
                },
              ],
            }),
            { status: 200 }
          )
        }
        if (url === '/api/admin/videos/video-1' && init?.method === 'DELETE') {
          return deleteRequest.promise
        }
        if (url === '/api/admin/videos/video-2' && init?.method === 'DELETE') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

    const user = userEvent.setup()
    render(<VideoManager memorialId="page-15b" />)

    await screen.findByText('First clip')
    const deleteButtons = screen.getAllByRole('button', {
      name: /delete video/i,
    })

    await user.click(deleteButtons[0]!)
    await user.click(deleteButtons[1]!)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/videos/video-1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/videos/video-2',
      expect.objectContaining({ method: 'DELETE' })
    )

    deleteRequest.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    await waitFor(() => {
      expect(screen.queryByText('First clip')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Second clip')).toBeInTheDocument()
  })
})
