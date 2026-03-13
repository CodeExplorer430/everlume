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

  it('wraps backwards with the left arrow key while lightbox is open', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Second memory')).toBeInTheDocument()
  })

  it('moves to the previous photo with the left arrow key from a later selection', async () => {
    const user = userEvent.setup()
    render(<PublicGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: /open photo 2/i }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('First memory')).toBeInTheDocument()
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

  it('opens a missing-image photo and uses empty-source fallbacks in the lightbox', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[{ id: 'missing', caption: 'No source yet', image_url: null }]}
      />
    )

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))

    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(
      within(dialog).queryByAltText('No source yet')
    ).not.toBeInTheDocument()
    expect(within(dialog).getByText('Missing image URL')).toBeInTheDocument()
    expect(within(dialog).getByText('No source yet')).toBeInTheDocument()
  })

  it('marks protected-media thumbnails as unoptimized and falls back to generated labels when captions are missing', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          {
            id: 'p1',
            thumb_url: '/api/public/media/photo-1?variant=thumb',
            image_url: '/api/public/media/photo-1',
          },
        ]}
      />
    )

    const thumbnail = screen.getByAltText('Memorial photo 1')
    expect(thumbnail).toHaveAttribute('data-unoptimized', 'true')
    expect(
      screen.getByRole('button', { name: 'Open photo 1' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
      'data-unoptimized',
      'true'
    )
    expect(within(dialog).queryByText('Open photo 1')).not.toBeInTheDocument()
  })

  it('uses the main image url for proxy thumbnails when no thumb url exists', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          {
            id: 'p1',
            image_url: '/api/public/media/photo-1?variant=image',
          },
        ]}
      />
    )

    const thumbnail = screen.getByAltText('Memorial photo 1')
    expect(thumbnail).toHaveAttribute(
      'src',
      '/api/public/media/photo-1?variant=image'
    )
    expect(thumbnail).toHaveAttribute('data-unoptimized', 'true')

    await user.click(screen.getByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
      'src',
      '/api/public/media/photo-1?variant=image'
    )
  })

  it('falls back to the thumbnail in the lightbox and omits the caption block when no caption exists', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          {
            id: 'p1',
            thumb_url: 'https://example.com/thumb-only.jpg',
            image_url: null,
          },
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    const image = within(dialog).getByAltText('Memorial photo 1')

    expect(image).toHaveAttribute('src', 'https://example.com/thumb-only.jpg')
    expect(image).toHaveAttribute('data-unoptimized', 'false')
    expect(within(dialog).queryByText('Open photo 1')).not.toBeInTheDocument()
  })

  it('keeps non-proxy lightbox images optimized while proxy-backed sources stay unoptimized', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          {
            id: 'p1',
            thumb_url: 'https://example.com/thumb-only.jpg',
            image_url: null,
          },
          {
            id: 'p2',
            thumb_url: '/api/public/media/photo-2?variant=thumb',
            image_url: '/api/public/media/photo-2?variant=image',
          },
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Open photo 1' }))
    let dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
      'data-unoptimized',
      'false'
    )

    await user.click(screen.getByRole('button', { name: /next photo/i }))
    dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Memorial photo 2')).toHaveAttribute(
      'data-unoptimized',
      'true'
    )
  })

  it('does not show slideshow controls when only one photo is available', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[photos[0]]}
        slideshowEnabled
        slideshowIntervalMs={3000}
      />
    )

    await user.click(screen.getByRole('button', { name: /open photo 1/i }))

    expect(
      screen.queryByRole('button', { name: /pause slideshow/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /resume slideshow/i })
    ).not.toBeInTheDocument()
  })

  it('clamps slideshow intervals to the minimum supported value', async () => {
    vi.useFakeTimers()

    try {
      render(
        <PublicGallery
          photos={photos}
          slideshowEnabled
          slideshowIntervalMs={500}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /open photo 1/i }))
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1999)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('Second memory')
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses the default slideshow interval when none is provided', async () => {
    vi.useFakeTimers()

    try {
      render(<PublicGallery photos={photos} slideshowEnabled />)

      fireEvent.click(screen.getByRole('button', { name: /open photo 1/i }))
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(4499)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('First memory')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(
        within(
          screen.getByRole('dialog', { name: /photo lightbox/i })
        ).getByAltText('Second memory')
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses the protected-media thumbnail fallback in the lightbox when the main image is missing', async () => {
    const user = userEvent.setup()
    render(
      <PublicGallery
        photos={[
          {
            id: 'p1',
            thumb_url: '/api/public/media/photo-1?variant=thumb',
            image_url: undefined,
          },
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Open photo 1' }))
    const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
    expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
      'src',
      '/api/public/media/photo-1?variant=thumb'
    )
    expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
      'data-unoptimized',
      'true'
    )
  })

  it('uses the protected-media main image url in the lightbox and falls back to the default interval when zero is provided', async () => {
    vi.useFakeTimers()

    try {
      render(
        <PublicGallery
          photos={[
            {
              id: 'p1',
              thumb_url: '/api/public/media/photo-1?variant=thumb',
              image_url: '/api/public/media/photo-1?variant=image',
            },
            photos[1],
          ]}
          slideshowEnabled
          slideshowIntervalMs={0}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Open photo 1' }))
      const dialog = screen.getByRole('dialog', { name: /photo lightbox/i })
      expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
        'src',
        '/api/public/media/photo-1?variant=image'
      )
      expect(within(dialog).getByAltText('Memorial photo 1')).toHaveAttribute(
        'data-unoptimized',
        'true'
      )

      await act(async () => {
        vi.advanceTimersByTime(4499)
      })
      expect(
        within(dialog).getByAltText('Memorial photo 1')
      ).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(within(dialog).getByAltText('Second memory')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
