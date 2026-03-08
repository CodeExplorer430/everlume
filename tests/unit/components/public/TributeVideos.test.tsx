import { render, screen } from '@testing-library/react'
import { TributeVideos } from '@/components/public/TributeVideos'

describe('TributeVideos', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud'
  })

  it('does not render section when videos empty', () => {
    const { container } = render(<TributeVideos videos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders iframe and title for each video', () => {
    render(
      <TributeVideos
        videos={[{ id: 'v1', provider: 'youtube', provider_id: 'abcdefghijk', title: 'Family Clip' }]}
      />
    )

    expect(screen.getByText('Video Memories')).toBeInTheDocument()
    expect(screen.getByTitle('Family Clip')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abcdefghijk'
    )
  })

  it('renders html5 video for cloudinary provider', () => {
    const { container } = render(
      <TributeVideos
        videos={[{ id: 'v2', provider: 'cloudinary', provider_id: 'everlume/page/video-1', title: 'Cloudinary Clip' }]}
      />
    )

    const videoEl = container.querySelector('video')
    expect(videoEl).toBeTruthy()
    expect(videoEl?.getAttribute('src')).toContain('/video/upload/')
  })

  it('renders featured layout shell when configured', () => {
    render(
      <TributeVideos
        layout="featured"
        videos={[{ id: 'v1', provider: 'youtube', provider_id: 'abcdefghijk', title: 'Family Clip' }]}
      />
    )

    expect(screen.getByText('No additional videos yet.')).toBeInTheDocument()
  })
})
