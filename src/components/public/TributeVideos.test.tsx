import { render, screen } from '@testing-library/react'
import { TributeVideos } from '@/components/public/TributeVideos'

describe('TributeVideos', () => {
  it('does not render section when videos empty', () => {
    const { container } = render(<TributeVideos videos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders iframe and title for each video', () => {
    render(
      <TributeVideos
        videos={[{ id: 'v1', provider_id: 'abcdefghijk', title: 'Family Clip' }]}
      />
    )

    expect(screen.getByText('Video Memories')).toBeInTheDocument()
    expect(screen.getByTitle('Family Clip')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abcdefghijk'
    )
  })
})
