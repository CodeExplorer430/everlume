import { render, screen } from '@testing-library/react'
import { MemorialPageView } from '@/components/pages/public/MemorialPageView'

const mockPublicGallery = vi.fn()
const mockTributeVideos = vi.fn()
const mockTributeTimeline = vi.fn()
const mockTributeGuestbook = vi.fn()
const mockTributeHero = vi.fn()

vi.mock('@/components/public/PublicGallery', () => ({
  PublicGallery: (props: unknown) => {
    mockPublicGallery(props)
    return <div data-testid="public-gallery" />
  },
}))

vi.mock('@/components/public/TributeVideos', () => ({
  TributeVideos: (props: unknown) => {
    mockTributeVideos(props)
    return <div data-testid="tribute-videos" />
  },
}))

vi.mock('@/components/public/TributeTimeline', () => ({
  TributeTimeline: (props: unknown) => {
    mockTributeTimeline(props)
    return <div data-testid="tribute-timeline" />
  },
}))

vi.mock('@/components/public/TributeGuestbook', () => ({
  TributeGuestbook: (props: unknown) => {
    mockTributeGuestbook(props)
    return <div data-testid="tribute-guestbook" />
  },
}))

vi.mock('@/components/public/TributeHero', () => ({
  TributeHero: (props: unknown) => {
    mockTributeHero(props)
    return <div data-testid="tribute-hero" />
  },
}))

describe('MemorialPageView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockPublicGallery.mockReset()
    mockTributeVideos.mockReset()
    mockTributeTimeline.mockReset()
    mockTributeGuestbook.mockReset()
    mockTributeHero.mockReset()
  })

  it('renders empty gallery state when no photos are available', () => {
    render(
      <MemorialPageView
        page={{ id: 'page-1', title: 'In Loving Memory', full_name: 'Jane Doe', hero_image_url: null, dob: null, dod: null }}
        photos={[]}
        videos={[]}
        timeline={[]}
        guestbook={[]}
      />
    )

    expect(screen.getByTestId('tribute-hero')).toBeInTheDocument()
    expect(screen.getByText('No photos shared yet.')).toBeInTheDocument()
    expect(mockPublicGallery).not.toHaveBeenCalled()
    expect(mockTributeVideos).toHaveBeenCalledWith({ videos: [] })
    expect(mockTributeTimeline).toHaveBeenCalledWith({ timeline: [] })
    expect(mockTributeGuestbook).toHaveBeenCalledWith({ pageId: 'page-1', fullName: 'Jane Doe', entries: [] })
  })

  it('passes normalized photo captions to PublicGallery', () => {
    render(
      <MemorialPageView
        page={{ id: 'page-1', title: 'In Loving Memory', full_name: null, hero_image_url: null, dob: null, dod: null }}
        photos={[{ id: 'photo-1', image_url: '/image.jpg', thumb_url: '/thumb.jpg', caption: null }]}
        videos={[{ id: 'v1', provider_id: 'abcdefghijk', title: null }]}
        timeline={[{ id: 't1', year: 2001, text: 'Milestone' }]}
        guestbook={[{ id: 'g1', name: 'Ana', message: 'Forever', created_at: '2026-01-01T00:00:00.000Z' }]}
      />
    )

    expect(screen.getByTestId('public-gallery')).toBeInTheDocument()
    expect(mockPublicGallery).toHaveBeenCalledWith({
      photos: [{ id: 'photo-1', image_url: '/image.jpg', thumb_url: '/thumb.jpg', caption: undefined }],
    })
  })
})
