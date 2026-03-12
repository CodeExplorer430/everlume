import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MediaUpload } from '@/components/admin/MediaUpload'

let scriptState: 'success' | 'pending' = 'success'

function ScriptMock({ onLoad }: { onLoad?: () => void }) {
  useEffect(() => {
    if (scriptState === 'pending') return
    onLoad?.()
  }, [onLoad])
  return null
}

vi.mock('next/script', () => ({
  default: ScriptMock,
}))

describe('MediaUpload', () => {
  const originalCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const originalPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud'
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'demo-preset'
    scriptState = 'success'
    delete window.cloudinary
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloud
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = originalPreset
  })

  it('shows env warning when Cloudinary env is missing', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = ''
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = ''

    render(<MediaUpload memorialId="page-1" onUploadComplete={vi.fn()} />)

    expect(
      screen.getByText(
        /Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`/
      )
    ).toBeInTheDocument()
  })

  it('keeps the uploader button disabled until the widget script loads', () => {
    scriptState = 'pending'

    render(<MediaUpload memorialId="page-1" onUploadComplete={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    ).toBeDisabled()
  })

  it('opens cloudinary widget and registers uploaded photo metadata', async () => {
    const onUploadComplete = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null
    const openMock = vi.fn()

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: openMock }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )
    expect(openMock).toHaveBeenCalled()

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'memory-photo',
          public_id: 'everlume/page-1/photo-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
          bytes: 1000,
          format: 'jpg',
          width: 1200,
          height: 900,
        },
      })
      await widgetCallback?.(null, { event: 'queues-end' })
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/photos',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(
      await screen.findByText('Uploaded images this session: 1')
    ).toBeInTheDocument()
    expect(onUploadComplete).toHaveBeenCalled()
  })

  it('shows a configuration error when the widget global is unavailable after script load', async () => {
    const user = userEvent.setup()
    render(<MediaUpload memorialId="page-1" onUploadComplete={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    expect(
      await screen.findByText(
        'Cloudinary is not configured. Check NEXT_PUBLIC_CLOUDINARY_* env vars.'
      )
    ).toBeInTheDocument()
  })

  it('normalizes secure-url-only uploads and counts multiple successes in one session', async () => {
    const onUploadComplete = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: vi.fn() }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'first-photo',
          secure_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v123/everlume/page-1/photo-1.webp',
        },
      })
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'second-photo',
          public_id: 'everlume/page-1/photo-2',
          secure_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v456/everlume/page-1/photo-2.webp',
        },
      })
      await widgetCallback?.(null, { event: 'queues-end' })
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/photos',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(
          '"cloudinaryPublicId":"everlume/page-1/photo-1.webp"'
        ),
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByText('Uploaded images this session: 2')
    ).toBeInTheDocument()
    expect(onUploadComplete).toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    ).toBeEnabled()
  })

  it('shows widget and metadata errors', async () => {
    const onUploadComplete = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Metadata save failed' }), {
        status: 500,
      })
    )
    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: vi.fn() }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />
    )
    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    await act(async () => {
      await widgetCallback?.(new Error('Widget failed'), { event: 'error' })
    })
    expect(await screen.findByText('Widget failed')).toBeInTheDocument()

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'memory-photo',
          public_id: 'everlume/page-1/photo-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
        },
      })
    })
    expect(await screen.findByText('Metadata save failed')).toBeInTheDocument()

    await act(async () => {
      await widgetCallback?.(null, { event: 'close' })
    })
    expect(onUploadComplete).toHaveBeenCalled()
  })

  it('shows a fallback metadata error when the save response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('metadata save failed', { status: 500 })
    )
    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: vi.fn() }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<MediaUpload memorialId="page-1" onUploadComplete={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'memory-photo',
          public_id: 'everlume/page-1/photo-3',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
        },
      })
    })

    expect(
      await screen.findByText('Failed to save uploaded image metadata.')
    ).toBeInTheDocument()
  })

  it('ignores empty widget callbacks and keeps uploading until queues-end closes the session', async () => {
    const onUploadComplete = vi.fn()
    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: vi.fn() }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    await act(async () => {
      await widgetCallback?.(null, undefined as never)
      await widgetCallback?.(null, { event: 'display-changed' })
    })

    expect(screen.getByRole('button', { name: 'Uploading...' })).toBeDisabled()
    expect(onUploadComplete).not.toHaveBeenCalled()

    await act(async () => {
      await widgetCallback?.(null, { event: 'queues-end' })
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
      ).toBeEnabled()
    })
    expect(onUploadComplete).toHaveBeenCalledTimes(1)
  })

  it('keeps the uploaded count after a later metadata failure and finishes on close', async () => {
    const onUploadComplete = vi.fn()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Metadata save failed' }), {
          status: 500,
        })
      )

    let widgetCallback:
      | ((
          error: Error | null,
          result: { event?: string; info?: { [key: string]: unknown } }
        ) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn(
          (_options: Record<string, unknown>, cb: typeof widgetCallback) => {
            widgetCallback = cb
            return { open: vi.fn() }
          }
        ),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(
      <MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Open Cloudinary Uploader' })
    )

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'first-photo',
          public_id: 'everlume/page-1/photo-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
        },
      })
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          public_id: 'everlume/page-1/photo-2',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v2/photo.jpg',
        },
      })
      await widgetCallback?.(null, { event: 'close' })
    })

    expect(
      await screen.findByText('Uploaded images this session: 1')
    ).toBeInTheDocument()
    expect(await screen.findByText('Metadata save failed')).toBeInTheDocument()
    expect(onUploadComplete).toHaveBeenCalledTimes(1)
  })
})
