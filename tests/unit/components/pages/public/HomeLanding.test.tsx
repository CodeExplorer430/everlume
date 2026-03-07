import { render, screen } from '@testing-library/react'
import { LandingContent } from '@/components/pages/public/HomeLanding'

describe('LandingContent', () => {
  it('renders primary CTA links with primary button styling', () => {
    render(<LandingContent directoryEnabled={false} memorials={[]} />)

    const openAdmin = screen.getByRole('link', { name: 'Open Admin' })
    const getStarted = screen.getByRole('link', { name: 'Get Started' })

    expect(openAdmin.className).toContain('bg-primary')
    expect(openAdmin.className).toContain('text-primary-foreground')
    expect(getStarted.className).toContain('bg-primary')
    expect(getStarted.className).toContain('text-primary-foreground')
  })
})
