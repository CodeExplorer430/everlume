import { render, screen } from '@testing-library/react'

const mockLandingContent = vi.fn<(props: { directoryEnabled: boolean; memorials: unknown[] }) => void>()
const mockSingle = vi.fn()
const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockPagesEq = vi.fn(() => ({ order: mockOrder }))
const mockPagesSelect = vi.fn(() => ({ eq: mockPagesEq }))
const mockSettingsEq = vi.fn(() => ({ single: mockSingle }))
const mockSettingsSelect = vi.fn(() => ({ eq: mockSettingsEq }))
const mockCreatePublicClient = vi.fn(() => ({
  from: (table: string) => {
    if (table === 'site_settings') return { select: mockSettingsSelect }
    return { select: mockPagesSelect }
  },
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => mockCreatePublicClient(),
}))

vi.mock('@/components/pages/public/HomeLanding', () => ({
  LandingContent: (props: { directoryEnabled: boolean; memorials: unknown[] }) => {
    mockLandingContent(props)
    return <div data-testid="landing" />
  },
}))

describe('Home page data loading', () => {
  beforeEach(() => {
    mockLandingContent.mockClear()
    mockCreatePublicClient.mockClear()
    mockSingle.mockReset()
    mockLimit.mockReset()
    mockSettingsSelect.mockClear()
    mockPagesSelect.mockClear()
  })

  it('loads directory entries when home directory is enabled', async () => {
    mockSingle.mockResolvedValue({ data: { home_directory_enabled: true }, error: null })
    mockLimit.mockResolvedValue({ data: [{ id: 'p1', title: 'A', slug: 'a', full_name: 'A Person' }], error: null })

    const mod = await import('@/app/page')
    const node = await mod.default()
    render(node)

    expect(screen.getByTestId('landing')).toBeInTheDocument()
    expect(mockPagesSelect).toHaveBeenCalled()
    expect(mockLandingContent).toHaveBeenCalledWith(
      expect.objectContaining({
        directoryEnabled: true,
        memorials: [{ id: 'p1', title: 'A', slug: 'a', full_name: 'A Person' }],
      })
    )
  })

  it('skips memorial query when directory is disabled', async () => {
    mockSingle.mockResolvedValue({ data: { home_directory_enabled: false }, error: null })

    const mod = await import('@/app/page')
    const node = await mod.default()
    render(node)

    expect(mockPagesSelect).not.toHaveBeenCalled()
    expect(mockLandingContent).toHaveBeenCalledWith(expect.objectContaining({ directoryEnabled: false, memorials: [] }))
  })

  it('falls back to disabled directory when settings query errors', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'db down' } })

    const mod = await import('@/app/page')
    const node = await mod.default()
    render(node)

    expect(mockPagesSelect).not.toHaveBeenCalled()
    expect(mockLandingContent).toHaveBeenCalledWith(expect.objectContaining({ directoryEnabled: false, memorials: [] }))
  })
})
