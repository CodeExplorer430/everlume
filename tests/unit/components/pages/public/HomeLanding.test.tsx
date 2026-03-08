import { render, screen } from '@testing-library/react'
import { HomeLanding, LandingContent } from '@/components/pages/public/HomeLanding'

describe('LandingContent', () => {
  it('renders primary CTA links with primary button styling', () => {
    render(<LandingContent directoryEnabled={false} memorials={[]} />)

    const openAdminLinks = screen.getAllByRole('link', { name: 'Open Admin' })

    expect(openAdminLinks[0].className).toContain('bg-primary')
    expect(openAdminLinks[0].className).toContain('text-primary-foreground')
    expect(openAdminLinks[1].className).toContain('bg-primary')
    expect(openAdminLinks[1].className).toContain('text-primary-foreground')
  })

  it('does not render memorial directory when disabled', () => {
    render(<HomeLanding />)
    expect(screen.queryByText('Memorial Directory')).not.toBeInTheDocument()
  })

  it('renders memorial cards and fallback names when directory is enabled', () => {
    render(
      <LandingContent
        directoryEnabled
        memorials={[
          { id: 'm1', title: 'Maria Santos', slug: 'maria-santos', full_name: 'Maria Santos' },
          { id: 'm2', title: 'Family Tribute', slug: 'family-tribute', full_name: null },
        ]}
      />
    )

    expect(screen.getByText('Memorial Directory')).toBeInTheDocument()
    expect(screen.getByText(/Private and password-protected memorials remain outside this directory\./)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText('Memorial')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'View memorial' })[0]).toHaveAttribute('href', '/memorials/maria-santos')
  })

  it('renders empty-state text when directory is enabled with no memorials', () => {
    render(<LandingContent directoryEnabled memorials={[]} />)
    expect(screen.getByText('Public memorial sharing is enabled, but no families have published a directory-listed memorial yet.')).toBeInTheDocument()
  })
})
