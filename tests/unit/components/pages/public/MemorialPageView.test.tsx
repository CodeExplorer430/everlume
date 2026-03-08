import { render, screen } from '@testing-library/react'
import { MemorialPageView } from '@/components/pages/public/MemorialPageView'

const mockPublicGallery = vi.fn()
const mockMemorialActionBar = vi.fn()
const mockTributeVideos = vi.fn()
const mockTributeTimeline = vi.fn()
const mockTributeGuestbook = vi.fn()
const mockTributeHero = vi.fn()
const mockProtectedMediaConsentGate = vi.fn()

vi.mock('@/components/public/MemorialActionBar', () => ({
  MemorialActionBar: (props: unknown) => {
    mockMemorialActionBar(props)
    return <div data-testid="memorial-action-bar" />
  },
}))

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

vi.mock('@/components/public/ProtectedMediaConsentGate', () => ({
  ProtectedMediaConsentGate: (props: unknown) => {
    mockProtectedMediaConsentGate(props)
    return <div data-testid="protected-media-consent-gate" />
  },
}))

describe('MemorialPageView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockPublicGallery.mockReset()
    mockMemorialActionBar.mockReset()
    mockTributeVideos.mockReset()
    mockTributeTimeline.mockReset()
    mockTributeGuestbook.mockReset()
    mockTributeHero.mockReset()
    mockProtectedMediaConsentGate.mockReset()
  })

  it('renders empty gallery state when no photos are available', () => {
    render(
      <MemorialPageView
        memorial={{
          id: 'page-1',
          title: 'In Loving Memory',
          full_name: 'Jane Doe',
          dedicationText: 'She loved deeply and served quietly.',
          hero_image_url: null,
          dob: null,
          dod: null,
          memorial_theme: 'classic',
          memorial_slideshow_enabled: true,
          memorial_slideshow_interval_ms: 4500,
          memorial_video_layout: 'grid',
        }}
        photos={[]}
        videos={[]}
        timeline={[]}
        guestbook={[]}
      />
    )

    expect(screen.getByTestId('tribute-hero')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-action-bar')).toBeInTheDocument()
    expect(screen.getByText('Photos will be added here')).toBeInTheDocument()
    expect(screen.getByText('She loved deeply and served quietly.')).toBeInTheDocument()
    expect(mockMemorialActionBar).toHaveBeenCalledWith({ memorialTitle: 'In Loving Memory', guestbookHref: '#guestbook' })
    expect(mockPublicGallery).not.toHaveBeenCalled()
    expect(mockTributeVideos).toHaveBeenCalledWith({ videos: [], layout: 'grid' })
    expect(mockTributeTimeline).toHaveBeenCalledWith({ timeline: [] })
    expect(mockTributeGuestbook).toHaveBeenCalledWith({ memorialId: 'page-1', fullName: 'Jane Doe', entries: [] })
  })

  it('passes normalized photo captions to PublicGallery', () => {
    const { container } = render(
      <MemorialPageView
        memorial={{
          id: 'page-1',
          title: 'In Loving Memory',
          full_name: null,
          dedicationText: null,
          hero_image_url: null,
          dob: null,
          dod: null,
          memorial_theme: 'serene',
          memorial_slideshow_enabled: true,
          memorial_slideshow_interval_ms: 4500,
          memorial_video_layout: 'grid',
        }}
        photos={[{ id: 'photo-1', image_url: '/image.jpg', thumb_url: '/thumb.jpg', caption: null }]}
        videos={[{ id: 'v1', provider: 'youtube', provider_id: 'abcdefghijk', title: null }]}
        timeline={[{ id: 't1', year: 2001, text: 'Milestone' }]}
        guestbook={[{ id: 'g1', name: 'Ana', message: 'Forever', created_at: '2026-01-01T00:00:00.000Z' }]}
        accessMode="public"
      />
    )

    expect(screen.getByTestId('public-gallery')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-action-bar')).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute('data-memorial-access', 'public')
    expect(mockPublicGallery).toHaveBeenCalledWith({
      photos: [{ id: 'photo-1', image_url: '/image.jpg', thumb_url: '/thumb.jpg', caption: undefined }],
      slideshowEnabled: true,
      slideshowIntervalMs: 4500,
      fit: 'cover',
      captionStyle: 'classic',
    })
    expect(screen.getByText(/Welcome to the memorial for our loved one\./)).toBeInTheDocument()
  })

  it('shows the consent gate instead of protected media until consent is granted', () => {
    render(
      <MemorialPageView
        memorial={{
          id: 'page-1',
          title: 'In Loving Memory',
          full_name: 'Jane Doe',
          dedicationText: null,
          hero_image_url: null,
          dob: null,
          dod: null,
          memorial_theme: 'classic',
          memorial_slideshow_enabled: true,
          memorial_slideshow_interval_ms: 4500,
          memorial_video_layout: 'featured',
        }}
        photos={[]}
        videos={[]}
        timeline={[]}
        guestbook={[]}
        accessMode="password"
        requiresMediaConsent
        mediaConsentSlug="jane-doe"
      />
    )

    expect(screen.getByTestId('protected-media-consent-gate')).toBeInTheDocument()
    expect(mockProtectedMediaConsentGate).toHaveBeenCalledWith({ slug: 'jane-doe' })
    expect(mockPublicGallery).not.toHaveBeenCalled()
    expect(mockTributeVideos).not.toHaveBeenCalled()
  })
})
