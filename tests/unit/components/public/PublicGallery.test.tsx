import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicGallery } from '@/components/public/PublicGallery'
import { ImgHTMLAttributes } from 'react'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt || ''} src={props.src as string} />
  },
}))

describe('PublicGallery', () => {
  const photos = [
    { id: 'p1', thumb_url: 'https://example.com/thumb1.jpg', image_url: 'https://example.com/image1.jpg', caption: 'First memory' },
    { id: 'p2', thumb_url: 'https://example.com/thumb2.jpg', image_url: 'https://example.com/image2.jpg', caption: 'Second memory' },
  ]

  it('opens and closes lightbox with keyboard support', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    expect(screen.getByRole('dialog', { name: /photo lightbox/i })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /photo lightbox/i })).not.toBeInTheDocument()
  })

  it('navigates photos with arrow keys while lightbox is open', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Second memory')).toBeInTheDocument()
  })

  it('shows slideshow controls when slideshow is enabled', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} slideshowEnabled slideshowIntervalMs={3000} />)

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    expect(screen.getByRole('button', { name: /pause slideshow/i })).toBeInTheDocument()
  })
})
