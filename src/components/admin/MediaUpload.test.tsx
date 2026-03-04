import { render, screen } from '@testing-library/react'
import { MediaUpload } from '@/components/admin/MediaUpload'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ insert: vi.fn() }),
  }),
}))

describe('MediaUpload', () => {
  it('shows env warning when Cloudinary env is missing', () => {
    const previousCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const previousPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = ''
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = ''

    render(<MediaUpload pageId="page-1" onUploadComplete={vi.fn()} />)

    expect(
      screen.getByText(/Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` or `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`/)
    ).toBeInTheDocument()

    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = previousCloud
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = previousPreset
  })
})
