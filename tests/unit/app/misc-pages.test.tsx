import { render, screen } from '@testing-library/react'

const mockRedirect = vi.fn<(url: string) => never>(() => {
  throw new Error('NEXT_REDIRECT')
})
const mockSiteSettingsSingle = vi.fn()
const mockSiteSettingsEq = vi.fn(() => ({ single: mockSiteSettingsSingle }))
const mockSiteSettingsSelect = vi.fn(() => ({ eq: mockSiteSettingsEq }))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({
    from: () => ({
      select: mockSiteSettingsSelect,
    }),
  }),
}))

describe('misc app pages', () => {
  beforeEach(() => {
    mockRedirect.mockReset()
    mockSiteSettingsSingle.mockReset()
    mockSiteSettingsSingle.mockResolvedValue({ data: { home_directory_enabled: false }, error: null })
  })

  it('renders offline page', async () => {
    const mod = await import('@/app/offline/page')
    render(mod.default())
    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument()
  })

  it('renders memorial not found page', async () => {
    const mod = await import('@/app/memorials/[slug]/not-found')
    render(mod.default())
    expect(screen.getByText(/^memorial not found$/i)).toBeInTheDocument()
  })

  it('renders short-link fallback page', async () => {
    const mod = await import('@/app/r/not-found/page')
    const node = await mod.default({ searchParams: Promise.resolve({ code: 'hello', reason: 'missing' }) })
    render(node)
    expect(screen.getByText(/hello/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /browse public memorials/i })).not.toBeInTheDocument()
  })

  it('shows the memorial directory CTA on redirect fallback when directory is enabled', async () => {
    mockSiteSettingsSingle.mockResolvedValue({ data: { home_directory_enabled: true }, error: null })

    const mod = await import('@/app/r/not-found/page')
    const node = await mod.default({ searchParams: Promise.resolve({ code: 'hello', reason: 'disabled' }) })
    render(node)

    expect(screen.getByRole('link', { name: /browse public memorials/i })).toHaveAttribute('href', '/#memorial-directory')
  })

  it('redirects legacy pages routes to memorials', async () => {
    const legacyPage = await import('@/app/pages/[slug]/page')
    await expect(legacyPage.default({ params: Promise.resolve({ slug: 'maria' }) })).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/memorials/maria')
  })

  it('renders the canonical memorial not-found UI for legacy pages routes', async () => {
    const legacyNotFound = await import('@/app/pages/[slug]/not-found')
    render(legacyNotFound.default())
    expect(screen.getByText(/^memorial not found$/i)).toBeInTheDocument()
  })
})
