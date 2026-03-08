import { render, screen } from '@testing-library/react'

const mockMemorialPageView = vi.fn()
const mockPageUnlockForm = vi.fn()
const mockCanAccessMemorialPage = vi.fn()
const mockCreateSignedMediaToken = vi.fn()
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

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}))

vi.mock('@/components/pages/public/MemorialPageView', () => ({
  MemorialPageView: (props: unknown) => {
    mockMemorialPageView(props)
    return <div data-testid="memorial-page-view" />
  },
}))

vi.mock('@/components/public/PageUnlockForm', () => ({
  PageUnlockForm: (props: unknown) => {
    mockPageUnlockForm(props)
    return <div data-testid="page-unlock-form" />
  },
}))

vi.mock('@/lib/server/page-access', () => ({
  canAccessMemorialPage: (...args: unknown[]) => mockCanAccessMemorialPage(...args),
}))

vi.mock('@/lib/server/private-media', () => ({
  createSignedMediaToken: (...args: unknown[]) => mockCreateSignedMediaToken(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'pages') return { select: mockPageSelect }
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
    mockPageUnlockForm.mockReset()
    mockCanAccessMemorialPage.mockReset()
    mockCreateSignedMediaToken.mockReset()
    mockNotFound.mockClear()
    mockPageSingle.mockReset()
    mockPhotosOrder.mockReset()
    mockGuestbookOrder.mockReset()
    mockTimelineOrder.mockReset()
    mockVideosOrder.mockReset()
  })

  it('renders public memorial view with loaded resources', async () => {
    mockPageSingle.mockResolvedValue({ data: publicPage })
    mockPhotosOrder.mockResolvedValue({ data: [{ id: 'photo-1', page_id: 'page-1', image_url: '/img.jpg', thumb_url: '/thumb.jpg', caption: null }] })
    mockGuestbookOrder.mockResolvedValue({ data: [{ id: 'entry-1', name: 'Ana', message: 'Forever', created_at: '2026-01-01T00:00:00.000Z' }] })
    mockTimelineOrder.mockResolvedValue({ data: [{ id: 't1', year: 2000, text: 'A milestone' }] })
    mockVideosOrder.mockResolvedValue({ data: [{ id: 'v1', provider_id: 'abcdefghijk', title: 'Memories' }] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({ params: Promise.resolve({ slug: 'jane' }) })
    render(node)

    expect(screen.getByTestId('memorial-page-view')).toBeInTheDocument()
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        page: publicPage,
        photos: expect.arrayContaining([expect.objectContaining({ id: 'photo-1' })]),
      })
    )
  })

  it('returns unlock form when password access is required', async () => {
    mockPageSingle.mockResolvedValue({ data: { ...publicPage, access_mode: 'password', privacy: 'private' } })
    mockCanAccessMemorialPage.mockResolvedValue({ allowed: false, requiresPassword: true })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({ params: Promise.resolve({ slug: 'jane' }) })
    render(node)

    expect(screen.getByTestId('page-unlock-form')).toBeInTheDocument()
    expect(mockPageUnlockForm).toHaveBeenCalledWith({ slug: 'jane' })
    expect(mockMemorialPageView).not.toHaveBeenCalled()
  })

  it('throws notFound when memorial is inaccessible', async () => {
    mockPageSingle.mockResolvedValue({ data: { ...publicPage, access_mode: 'private', privacy: 'private' } })
    mockCanAccessMemorialPage.mockResolvedValue({ allowed: false, requiresPassword: false })

    const mod = await import('@/app/memorials/[slug]/page')
    await expect(mod.default({ params: Promise.resolve({ slug: 'jane' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('generates password-protected metadata when access requires password', async () => {
    mockPageSingle.mockResolvedValue({ data: { ...publicPage, access_mode: 'password', privacy: 'private' } })
    mockCanAccessMemorialPage.mockResolvedValue({ allowed: false, requiresPassword: true })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({ params: Promise.resolve({ slug: 'jane' }) })

    expect(metadata).toEqual({
      title: 'Password Protected Memorial | Everlume',
      robots: { index: false, follow: false },
    })
  })

  it('generates open graph metadata for public memorial', async () => {
    mockPageSingle.mockResolvedValue({ data: publicPage })

    const mod = await import('@/app/memorials/[slug]/page')
    const metadata = await mod.generateMetadata({ params: Promise.resolve({ slug: 'jane' }) })

    expect(metadata).toEqual(
      expect.objectContaining({
        title: 'In Loving Memory | Everlume',
        openGraph: expect.objectContaining({
          images: ['https://cdn.example.com/hero.jpg'],
        }),
      })
    )
  })

  it('resolves signed photo urls for private memorial rendering', async () => {
    mockPageSingle.mockResolvedValue({ data: { ...publicPage, access_mode: 'password', privacy: 'private' } })
    mockCanAccessMemorialPage.mockResolvedValue({ allowed: true, requiresPassword: false })
    mockCreateSignedMediaToken.mockImplementation((photoId: string, variant: string) => `${photoId}-${variant}-token`)
    mockPhotosOrder.mockResolvedValue({ data: [{ id: 'photo-1', page_id: 'page-1', image_url: null, thumb_url: null, caption: 'Memory' }] })
    mockGuestbookOrder.mockResolvedValue({ data: [] })
    mockTimelineOrder.mockResolvedValue({ data: [] })
    mockVideosOrder.mockResolvedValue({ data: [] })

    const mod = await import('@/app/memorials/[slug]/page')
    const node = await mod.default({ params: Promise.resolve({ slug: 'jane' }) })
    render(node)

    expect(mockCreateSignedMediaToken).toHaveBeenCalledWith('photo-1', 'image')
    expect(mockCreateSignedMediaToken).toHaveBeenCalledWith('photo-1', 'thumb')
    expect(mockMemorialPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [
          expect.objectContaining({
            image_url: '/api/public/media/photo-1?variant=image&token=photo-1-image-token',
            thumb_url: '/api/public/media/photo-1?variant=thumb&token=photo-1-thumb-token',
          }),
        ],
      })
    )
  })
})
