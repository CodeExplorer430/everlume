import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPhotoGallery } from '@/components/admin/AdminPhotoGallery'

vi.mock('next/image', () => ({
  default: () => <div data-testid="next-image" />,
}))

describe('AdminPhotoGallery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders empty state when there are no photos', () => {
    render(
      <AdminPhotoGallery
        photos={[]}
        heroImageUrl={null}
        onRefresh={vi.fn()}
        onSetHero={vi.fn()}
      />
    )

    expect(screen.getByText('No photos uploaded yet.')).toBeInTheDocument()
  })

  it('sets hero image and edits caption', async () => {
    const onSetHero = vi.fn()
    const onRefresh = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    const user = userEvent.setup()
    render(
      <AdminPhotoGallery
        photos={[
          {
            id: 'photo-1',
            caption: 'Old caption',
            sort_index: 0,
            image_url: 'https://cdn.example.com/full.jpg',
            thumb_url: 'https://cdn.example.com/thumb.jpg',
          },
        ]}
        heroImageUrl={null}
        onRefresh={onRefresh}
        onSetHero={onSetHero}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Set as Hero' }))
    expect(onSetHero).toHaveBeenCalledWith('https://cdn.example.com/full.jpg')

    await user.click(screen.getByText('Old caption'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Updated caption')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/photos/photo-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })
    expect(onRefresh).toHaveBeenCalled()
  })

  it('renders hero badge for the selected hero image', () => {
    render(
      <AdminPhotoGallery
        photos={[
          {
            id: 'photo-1',
            caption: 'Hero photo',
            sort_index: 0,
            image_url: 'https://cdn.example.com/full.jpg',
            thumb_url: 'https://cdn.example.com/thumb.jpg',
          },
        ]}
        heroImageUrl="https://cdn.example.com/full.jpg"
        onRefresh={vi.fn()}
        onSetHero={vi.fn()}
      />
    )

    expect(screen.getByText('HERO')).toBeInTheDocument()
  })

  it('renders the missing-image fallback, disables hero action, and starts editing from the placeholder', async () => {
    const user = userEvent.setup()

    render(
      <AdminPhotoGallery
        photos={[
          {
            id: 'photo-1',
            caption: '',
            sort_index: 0,
            image_url: null,
            thumb_url: null,
          },
        ]}
        heroImageUrl={null}
        onRefresh={vi.fn()}
        onSetHero={vi.fn()}
      />
    )

    expect(screen.getByText('Missing image URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set as Hero' })).toBeDisabled()

    await user.click(screen.getByText('Add caption...'))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('keeps caption editing open and shows the fallback error when save fails with non-json', async () => {
    const onRefresh = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 })
    )

    const user = userEvent.setup()
    render(
      <AdminPhotoGallery
        photos={[
          {
            id: 'photo-1',
            caption: 'Old caption',
            sort_index: 0,
            image_url: 'https://cdn.example.com/full.jpg',
            thumb_url: 'https://cdn.example.com/thumb.jpg',
          },
        ]}
        heroImageUrl={null}
        onRefresh={onRefresh}
        onSetHero={vi.fn()}
      />
    )

    await user.click(screen.getByText('Old caption'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Unable to update caption.')
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('respects delete confirmation, shows delete API error, then clears it after a successful retry', async () => {
    const onRefresh = vi.fn()
    const confirmMock = vi.spyOn(window, 'confirm')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Delete failed' }), {
          status: 500,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    const user = userEvent.setup()
    render(
      <AdminPhotoGallery
        photos={[
          {
            id: 'photo-1',
            caption: 'Old caption',
            sort_index: 0,
            image_url: 'https://cdn.example.com/full.jpg',
            thumb_url: 'https://cdn.example.com/thumb.jpg',
          },
        ]}
        heroImageUrl={null}
        onRefresh={onRefresh}
        onSetHero={vi.fn()}
      />
    )

    confirmMock.mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/photos/photo-1',
      expect.objectContaining({ method: 'DELETE' })
    )

    confirmMock.mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    expect(onRefresh).not.toHaveBeenCalled()

    confirmMock.mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByText('Delete failed')).not.toBeInTheDocument()
    })
  })
})
