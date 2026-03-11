/* eslint-disable @next/next/no-img-element */

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicGallery } from '@/components/public/PublicGallery'
import { ImgHTMLAttributes } from 'react'

vi.mock('next/image', () => ({
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }
  ) => {
    return (
      <img
        alt={props.alt || ''}
        src={props.src as string}
        className={props.className}
        data-unoptimized={String(props.unoptimized ?? false)}
      />
    )
  },
}))

describe('PublicGallery', () => {
  const photos = [
    {
      id: 'p1',
      thumb_url: 'https://example.com/thumb1.jpg',
      image_url: 'https://example.com/image1.jpg',
      caption: 'First memory',
    },
    {
      id: 'p2',
      thumb_url: 'https://example.com/thumb2.jpg',
      image_url: 'https://example.com/image2.jpg',
      caption: 'Second memory',
    },
  ]

  it('opens and closes lightbox with keyboard support', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    expect(
      screen.getByRole('dialog', { name: /photo lightbox/i })
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(
      screen.queryByRole('dialog', { name: /photo lightbox/i })
    ).not.toBeInTheDocument()
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
    render(
      <PublicGallery
        photos={photos}
        slideshowEnabled
        slideshowIntervalMs={3000}
      />
    )

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    expect(
      screen.getByRole('button', { name: /pause slideshow/i })
    ).toBeInTheDocument()
  })

  it('wraps to the previous photo and restores focus when closing from the close button', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    const opener = screen.getByRole('button', { name: /open photo 1/i })
    opener.focus()

    await user.click(opener)
    await user.click(screen.getByRole('button', { name: /previous photo/i }))

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Second memory')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /close photo lightbox/i })
    )
    expect(opener).toHaveFocus()
  })

  it('auto-advances the slideshow and supports pause and resume', async () => {
    vi.useFakeTimers()

    try {
      render(
        <PublicGallery
          photos={photos}
          slideshowEnabled
          slideshowIntervalMs={3000}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /open photo 1/i }))
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('Second memory')
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /pause slideshow/i }))
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('Second memory')
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /resume slideshow/i }))
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders missing-image fallback text and applies contain/minimal styling in the lightbox', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          { id: 'missing', caption: 'No source yet' },
          {
            id: 'styled',
            thumb_url: 'https://example.com/thumb-styled.jpg',
            image_url: 'https://example.com/image-styled.jpg',
            caption: 'Styled memory',
          },
        ]}
        fit="contain"
        captionStyle="minimal"
      />
    )

    expect(screen.getByText('Missing image URL')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open photo 2/i }))

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Styled memory')).toHaveClass(
      'object-contain'
    )
    expect(within(dialog).getByText('Styled memory')).toHaveClass('uppercase')
  })
})
