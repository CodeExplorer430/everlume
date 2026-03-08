import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MediaUpload } from '@/components/admin/MediaUpload'

function ScriptMock({ onLoad }: { onLoad?: () => void }) {
  useEffect(() => {
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
      screen.getByText(/Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`/)
    ).toBeInTheDocument()
  })

  it('opens cloudinary widget and registers uploaded photo metadata', async () => {
    const onUploadComplete = vi.fn()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    let widgetCallback:
      | ((error: Error | null, result: { event?: string; info?: { [key: string]: unknown } }) => void)
      | null = null
    const openMock = vi.fn()

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn((_options: Record<string, unknown>, cb: typeof widgetCallback) => {
          widgetCallback = cb
          return { open: openMock }
        }),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />)

    await user.click(screen.getByRole('button', { name: 'Open Cloudinary Uploader' }))
    expect(openMock).toHaveBeenCalled()

    await act(async () => {
      await widgetCallback?.(null, {
        event: 'success',
        info: {
          original_filename: 'memory-photo',
          public_id: 'everlume/page-1/photo-1',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
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
    expect(await screen.findByText('Uploaded images this session: 1')).toBeInTheDocument()
    expect(onUploadComplete).toHaveBeenCalled()
  })

  it('shows widget and metadata errors', async () => {
    const onUploadComplete = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Metadata save failed' }), { status: 500 }))
    let widgetCallback:
      | ((error: Error | null, result: { event?: string; info?: { [key: string]: unknown } }) => void)
      | null = null

    Object.defineProperty(window, 'cloudinary', {
      value: {
        createUploadWidget: vi.fn((_options: Record<string, unknown>, cb: typeof widgetCallback) => {
          widgetCallback = cb
          return { open: vi.fn() }
        }),
      },
      configurable: true,
    })

    const user = userEvent.setup()
    render(<MediaUpload memorialId="page-1" onUploadComplete={onUploadComplete} />)
    await user.click(screen.getByRole('button', { name: 'Open Cloudinary Uploader' }))

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
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',
        },
      })
    })
    expect(await screen.findByText('Metadata save failed')).toBeInTheDocument()

    await act(async () => {
      await widgetCallback?.(null, { event: 'close' })
    })
    expect(onUploadComplete).toHaveBeenCalled()
  })
})
