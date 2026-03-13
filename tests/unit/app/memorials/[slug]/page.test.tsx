import { render, screen } from '@testing-library/react'

const mockMemorialPageView = vi.fn()
const mockMemorialUnlockForm = vi.fn()
const mockCanAccessMemorial = vi.fn()
const mockCreateSignedMediaToken = vi.fn()
const mockVerifyMediaConsent = vi.fn()
const mockCookies = vi.fn()
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

const mockPageSingle = vi.fn()
const mockPageEq = vi.fn(() => ({ single: mockPageSingle }))
const mockPageSelect = vi.fn(() => ({ eq: mockPageEq }))

const mockPhotosOrder = vi.fn()
const mockPhotosEq = vi.fn(() => ({ order: mockPhotosOrder }))
const mockPhotosSelect = vi.fn(() => ({ eq: mockPhotosEq }))

const mockGuestbookOrder = vi.fn()
const mockGuestbookApprovedEq = vi.fn(() => ({ order: mockGuestbookOrder }))
const mockGuestbookPageEq = vi.fn(() => ({ eq: mockGuestbookApprovedEq }))
const mockGuestbookSelect = vi.fn(() => ({ eq: mockGuestbookPageEq }))

const mockTimelineOrder = vi.fn()
const mockTimelineEq = vi.fn(() => ({ order: mockTimelineOrder }))
const mockTimelineSelect = vi.fn(() => ({ eq: mockTimelineEq }))

const mockVideosOrder = vi.fn()
const mockVideosEq = vi.fn(() => ({ order: mockVideosOrder }))
const mockVideosSelect = vi.fn(() => ({ eq: mockVideosEq }))
const mockSiteSettingsSingle = vi.fn()
const mockSiteSettingsEq = vi.fn(() => ({ single: mockSiteSettingsSingle }))
const mockSiteSettingsSelect = vi.fn(() => ({ eq: mockSiteSettingsEq }))

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}))

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

vi.mock('@/components/pages/public/MemorialPageView', () => ({
  MemorialPageView: (props: unknown) => {
    mockMemorialPageView(props)
    return <div data-testid="memorial-page-view" />
  },
}))

vi.mock('@/components/public/MemorialUnlockForm', () => ({
  MemorialUnlockForm: (props: unknown) => {
    mockMemorialUnlockForm(props)
    return <div data-testid="memorial-unlock-form" />
  },
}))

vi.mock('@/lib/server/page-access', () => ({
  canAccessMemorial: (...args: unknown[]) => mockCanAccessMemorial(...args),
  resolveMemorialAccessMode: (page: {
    access_mode?: 'public' | 'private' | 'password' | null
    privacy?: 'public' | 'private' | null
  }) => page.access_mode || (page.privacy === 'private' ? 'private' : 'public'),
  memorialRequiresProtectedMedia: (page: {
    access_mode?: 'public' | 'private' | 'password' | null
    privacy?: 'public' | 'private' | null
  }) =>
    (page.access_mode ||
      (page.privacy === 'private' ? 'private' : 'public')) !== 'public',
}))

vi.mock('@/lib/server/private-media', () => ({
  createSignedMediaToken: (...args: unknown[]) =>
    mockCreateSignedMediaToken(...args),
}))

vi.mock('@/lib/server/media-consent', () => ({
  getMemorialMediaConsentCookieName: (memorialId: string) =>
    `everlume_memorial_media_consent_${memorialId}`,
  verifyMemorialMediaConsentToken: (...args: unknown[]) =>
    mockVerifyMediaConsent(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'pages') return { select: mockPageSelect }
      if (table === 'site_settings') return { select: mockSiteSettingsSelect }
      if (table === 'photos') return { select: mockPhotosSelect }
      if (table === 'guestbook') return { select: mockGuestbookSelect }
      if (table === 'timeline_events') return { select: mockTimelineSelect }
      return { select: mockVideosSelect }
    },
  }),
}))

const publicPage = {
  id: 'page-1',
  slug: 'jane',
  title: 'In Loving Memory',
  full_name: 'Jane Doe',
  dedication_text: 'Beloved in every season.',
  hero_image_url: 'https://cdn.example.com/hero.jpg',
  privacy: 'public',
  access_mode: 'public',
  dob: '1950-01-01',
  dod: '2025-01-01',
}

describe('/memorials/[slug] page', () => {
  beforeEach(() => {
    vi.resetModules()
    mockMemorialPageView.mockReset()
    mockMemorialUnlockForm.mockReset()
    mockCanAccessMemorial.mockReset()
    mockCreateSignedMediaToken.mockReset()
    mockVerifyMediaConsent.mockReset()
    mockCookies.mockReset()
    mockNotFound.mockClear()
    mockPageSingle.mockReset()
    mockPhotosOrder.mockReset()
    mockGuestbookOrder.mockReset()
    mockTimelineOrder.mockReset()
    mockVideosOrder.mockReset()
    mockSiteSettingsSingle.mockReset()
    mockSiteSettingsSingle.mockResolvedValue({
      data: {
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'grid',
      },
    })
    mockVerifyMediaConsent.mockReturnValue(true)
    mockCookies.mockResolvedValue({
      get: vi.fn(() => ({ value: 'valid-consent-token' })),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders public memorial view with loaded resources', async () => {
    mockPageSingle.mockResolvedValue({ data: publicPage })
    mockPhotosOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          page_id: 'page-1',
          image_url: '/img.jpg',
          thumb_url: '/thumb.jpg',
          caption: null,
        },
      ],
    })
    mockGuestbookOrder.mockResolvedValue({
      data: [
        {
          id: 'entry-1',
          name: 'Ana',
          message: 'Forever',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    mockTimelineOrder.mockResolvedValue({
      data: [{ id: 't1', year: 2000, text: 'A milestone' }],
    })
    mockVideosOrder.mockResolvedValue({
      data: [{ id: 'v1', provider_id: 'abcdefghijk', title: 'Memories' }],
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(screen.getByTestId('memorial-page-view')).toBeInTheDocument()
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        memorial: expect.objectContaining({
          id: 'page-1',
          slug: 'jane',
          title: 'In Loving Memory',
          full_name: 'Jane Doe',
          dedicationText: 'Beloved in every season.',
          accessMode: 'public',
        }),
        photos: expect.arrayContaining([
          expect.objectContaining({ id: 'photo-1' }),
        ]),
      })
    )
  })

  it('returns unlock form when password access is required', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, access_mode: 'password', privacy: 'private' },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: true,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(screen.getByTestId('memorial-unlock-form')).toBeInTheDocument()
    expect(mockMemorialUnlockForm).toHaveBeenCalledWith({ slug: 'jane' })
    expect(mockMemorialPageView).not.toHaveBeenCalled()
  })

  it('throws notFound when memorial is inaccessible', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, access_mode: 'private', privacy: 'private' },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: false,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    await expect(
      mod.default({ params: Promise.resolve({ slug: 'jane' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('generates password-protected metadata when access requires password', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, access_mode: 'password', privacy: 'private' },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: true,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(metadata).toEqual({
      title: 'Password Protected Memorial | Everlume',
      robots: { index: false, follow: false },
    })
  })

  it('generates open graph metadata for public memorial', async () => {
    mockPageSingle.mockResolvedValue({ data: publicPage })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(metadata).toEqual(
      expect.objectContaining({
        title: 'In Loving Memory | Everlume',
        openGraph: expect.objectContaining({
          images: ['https://cdn.example.com/hero.jpg'],
        }),
      })
    )
  })

  it('generates private memorial metadata for inaccessible database-backed pages', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, access_mode: 'private', privacy: 'private' },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: false,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(metadata).toEqual({
      title: 'Private Memorial | Everlume',
      robots: { index: false, follow: false },
    })
  })

  it('generates private memorial metadata from fixtures without querying the database', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: false,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'e2e-private-memorial' }),
    })

    expect(metadata).toEqual({
      title: 'Private Memorial | Everlume',
      robots: { index: false, follow: false },
    })
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('generates password-protected metadata from fixtures without querying the database', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')
    mockCanAccessMemorial.mockResolvedValue({
      allowed: false,
      requiresPassword: true,
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'e2e-password-memorial' }),
    })

    expect(metadata).toEqual({
      title: 'Password Protected Memorial | Everlume',
      robots: { index: false, follow: false },
    })
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('generates open graph metadata from public fixtures without querying the database', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'e2e-public-memorial' }),
    })

    expect(metadata).toEqual(
      expect.objectContaining({
        title: 'In Loving Memory of Amelia Stone | Everlume',
        openGraph: expect.objectContaining({
          title: 'In Loving Memory of Amelia Stone',
          type: 'website',
        }),
      })
    )
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('uses fallback fixture metadata copy when the fixture has no name or hero image', async () => {
    vi.doMock('@/lib/server/e2e-public-fixtures', async () => {
      const actual = await vi.importActual<
        typeof import('@/lib/server/e2e-public-fixtures')
      >('@/lib/server/e2e-public-fixtures')

      return {
        ...actual,
        getE2EMemorialFixtureBySlug: (slug: string) =>
          slug === 'fixture-fallback'
            ? {
                memorial: {
                  ...publicPage,
                  slug: 'fixture-fallback',
                  full_name: null,
                  hero_image_url: null,
                },
              }
            : actual.getE2EMemorialFixtureBySlug(slug),
      }
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'fixture-fallback' }),
    })

    expect(metadata).toEqual(
      expect.objectContaining({
        description: 'A digital memorial for our loved one.',
        openGraph: expect.objectContaining({
          description: 'A digital memorial for our loved one.',
          images: [],
        }),
      })
    )
    expect(mockPageSingle).not.toHaveBeenCalled()
  })

  it('uses fallback metadata copy for database memorials without a name or hero image', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        ...publicPage,
        full_name: null,
        hero_image_url: null,
      },
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'jane' }),
    })

    expect(metadata).toEqual(
      expect.objectContaining({
        description: 'A digital memorial for our loved one.',
        openGraph: expect.objectContaining({
          description: 'A digital memorial for our loved one.',
          images: [],
        }),
      })
    )
  })

  it('returns empty metadata when the memorial cannot be found', async () => {
    mockPageSingle.mockResolvedValue({ data: null })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'missing' }),
    })

    expect(metadata).toEqual({})
  })

  it('prefers canonical access_mode over conflicting legacy privacy when rendering a public memorial', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, privacy: 'private', access_mode: 'public' },
    })
    mockPhotosOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          page_id: 'page-1',
          image_url: '/img.jpg',
          thumb_url: '/thumb.jpg',
          caption: null,
        },
      ],
    })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({ data: [] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockCanAccessMemorial).not.toHaveBeenCalled()
    expect(mockCreateSignedMediaToken).not.toHaveBeenCalled()
    expect(screen.getByTestId('memorial-page-view')).toBeInTheDocument()
  })

  it('resolves signed photo urls for private memorial rendering', async () => {
    mockPageSingle.mockResolvedValue({
      data: { ...publicPage, access_mode: 'password', privacy: 'private' },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: true,
      requiresPassword: false,
    })
    mockCreateSignedMediaToken.mockImplementation(
      (photoId: string, variant: string) => `${photoId}-${variant}-token`
    )
    mockPhotosOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          page_id: 'page-1',
          image_url: null,
          thumb_url: null,
          caption: 'Memory',
        },
      ],
    })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({ data: [] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockCreateSignedMediaToken).toHaveBeenCalledWith('photo-1', 'image')
    expect(mockCreateSignedMediaToken).toHaveBeenCalledWith('photo-1', 'thumb')
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [
          expect.objectContaining({
            image_url:
              '/api/public/media/photo-1?variant=image&token=photo-1-image-token',
            thumb_url:
              '/api/public/media/photo-1?variant=thumb&token=photo-1-thumb-token',
          }),
        ],
      })
    )
  })

  it('requires explicit media consent before protected media is rendered', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        ...publicPage,
        access_mode: 'password',
        privacy: 'private',
        password_updated_at: '2026-03-01T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: true,
      requiresPassword: false,
    })
    mockVerifyMediaConsent.mockReturnValue(false)
    mockPhotosOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          page_id: 'page-1',
          image_url: '/img.jpg',
          thumb_url: '/thumb.jpg',
          caption: null,
        },
      ],
    })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({
      data: [{ id: 'v1', provider_id: 'abcdefghijk', title: 'Memories' }],
    })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockCreateSignedMediaToken).not.toHaveBeenCalled()
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        requiresMediaConsent: true,
        mediaConsentSlug: 'jane',
        memorial: expect.objectContaining({
          hero_image_url: null,
        }),
        photos: [],
        videos: [],
      })
    )
  })

  it('falls back to default media consent copy and version when site settings are missing', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        ...publicPage,
        access_mode: 'password',
        privacy: 'private',
        password_updated_at: '2026-03-01T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: true,
      requiresPassword: false,
    })
    mockSiteSettingsSingle.mockResolvedValue({ data: null })
    mockVerifyMediaConsent.mockReturnValue(false)
    mockPhotosOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          page_id: 'page-1',
          image_url: '/img.jpg',
          thumb_url: '/thumb.jpg',
          caption: null,
        },
      ],
    })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({ data: [] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        requiresMediaConsent: true,
        mediaConsentTitle: 'Media Viewing Notice',
        mediaConsentBody:
          "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.",
        mediaConsentVersion: 1,
      })
    )
  })

  it('does not block rendering when a protected memorial has no media to gate', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        ...publicPage,
        hero_image_url: null,
        access_mode: 'password',
        privacy: 'private',
        password_updated_at: '2026-03-01T00:00:00.000Z',
      },
    })
    mockCanAccessMemorial.mockResolvedValue({
      allowed: true,
      requiresPassword: false,
    })
    mockVerifyMediaConsent.mockReturnValue(false)
    mockPhotosOrder.mockResolvedValue({ data: [] })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({ data: [] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockCreateSignedMediaToken).not.toHaveBeenCalled()
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        requiresMediaConsent: false,
        mediaConsentSlug: undefined,
        memorial: expect.objectContaining({
          hero_image_url: null,
        }),
        photos: [],
        videos: [],
      })
    )
  })

  it('renders public memorial fixtures without database reads', async () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'e2e-public-memorial' }),
    })
    render(node)

    expect(screen.getByTestId('memorial-page-view')).toBeInTheDocument()
    expect(mockPageSingle).not.toHaveBeenCalled()
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        memorial: expect.objectContaining({
          id: '11111111-1111-1111-1111-111111111111',
          accessMode: 'public',
        }),
        guestbook: [
          expect.objectContaining({
            id: '51111111-1111-1111-1111-111111111111',
          }),
        ],
      })
    )
  })

  it('falls back to empty collections and featured layout when database queries or settings omit values', async () => {
    mockPageSingle.mockResolvedValue({
      data: {
        ...publicPage,
        memorial_video_layout: null,
        memorial_slideshow_enabled: null,
        memorial_slideshow_interval_ms: null,
      },
    })
    mockSiteSettingsSingle.mockResolvedValue({
      data: {
        memorial_slideshow_enabled: true,
        memorial_slideshow_interval_ms: 4500,
        memorial_video_layout: 'featured',
      },
    })
    mockPhotosOrder.mockResolvedValue({ data: null })
    mockGuestbookOrder.mockResolvedValue({ data: null })
    mockTimelineOrder.mockResolvedValue({ data: null })
    mockVideosOrder.mockResolvedValue({ data: null })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({
      params: Promise.resolve({ slug: 'jane' }),
    })
    render(node)

    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        memorial: expect.objectContaining({
          memorial_video_layout: 'featured',
          memorial_slideshow_enabled: true,
          memorial_slideshow_interval_ms: 4500,
        }),
        photos: [],
        guestbook: [],
        timeline: [],
        videos: [],
      })
    )
  })

  it('throws notFound when the memorial record does not exist', async () => {
    mockPageSingle.mockResolvedValue({ data: null })

    const mod = await import('@/app/memorials/[slug]/page')
    await expect(
      mod.default({ params: Promise.resolve({ slug: 'missing' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })
})
