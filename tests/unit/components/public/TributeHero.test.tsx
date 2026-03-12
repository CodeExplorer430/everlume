import { render, screen } from '@testing-library/react'
import { TributeHero } from '@/components/public/TributeHero'

const mockNextImage = vi.fn()

vi.mock('next/image', () => ({
  default: (props: unknown) => {
    mockNextImage(props)
    return <div data-testid="hero-image" />
  },
}))

describe('TributeHero', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockNextImage.mockReset()
  })

  it('renders hero image and formatted date range', () => {
    render(
      <TributeHero
        memorial={{
          title: 'In Loving Memory',
          full_name: 'Jane Doe',
          dob: '1950-01-01',
          dod: '2025-03-07',
          hero_image_url: 'https://cdn.example.com/hero.jpg',
        }}
      />
    )

    expect(screen.getByTestId('hero-image')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'In Loving Memory' })
    ).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(
      screen.getByText('January 1, 1950 - March 7, 2025')
    ).toBeInTheDocument()
    expect(mockNextImage).toHaveBeenCalledWith(
      expect.objectContaining({ alt: 'Jane Doe' })
    )
  })

  it('renders gradient fallback and no date range when dates are missing', () => {
    render(
      <TributeHero
        memorial={{
          title: 'Beloved Parent',
          full_name: null,
          dob: null,
          dod: null,
          hero_image_url: null,
        }}
      />
    )

    expect(screen.queryByTestId('hero-image')).not.toBeInTheDocument()
    expect(screen.getByText('Beloved Parent')).toBeInTheDocument()
    expect(screen.getByTestId('hero-fallback')).toBeInTheDocument()
    expect(screen.queryByText(/Present/)).not.toBeInTheDocument()
  })

  it('falls back to the title for image alt text and renders partial life dates', () => {
    render(
      <TributeHero
        memorial={{
          title: 'Beloved Parent',
          full_name: null,
          dob: '1950-01-01',
          dod: null,
          hero_image_url: 'https://cdn.example.com/hero.jpg',
        }}
      />
    )

    expect(mockNextImage).toHaveBeenCalledWith(
      expect.objectContaining({ alt: 'Beloved Parent' })
    )
    expect(screen.getByText('January 1, 1950 - Present')).toBeInTheDocument()
  })

  it('renders an unknown birth date when only the death date is present', () => {
    render(
      <TributeHero
        memorial={{
          title: 'Beloved Parent',
          full_name: 'Jane Doe',
          dob: null,
          dod: '2025-03-07',
          hero_image_url: null,
        }}
      />
    )

    expect(screen.getByText('... - March 7, 2025')).toBeInTheDocument()
  })
})
