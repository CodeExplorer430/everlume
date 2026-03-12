import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminQRCodeSection } from '@/components/admin/AdminQRCodeSection'

const qrCodeGeneratorMock = vi.fn()

vi.mock('@/components/admin/QRCodeGenerator', () => ({
  QRCodeGenerator: (props: {
    url: string
    template?: string
    caption?: string
    showLogo?: boolean
  }) => {
    qrCodeGeneratorMock(props)
    return <div data-testid="qr-url">{props.url}</div>
  },
}))

describe('AdminQRCodeSection', () => {
  const originalShortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN

  beforeEach(() => {
    qrCodeGeneratorMock.mockClear()
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = ''
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = originalShortDomain
  })

  it('uses first redirect by default', () => {
    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[{ id: 'r1', shortcode: 'grandma' }]}
      />
    )

    expect(screen.getByTestId('qr-url')).toHaveTextContent(
      'http://localhost:3000/grandma'
    )
  })

  it('allows selecting another active redirect url', async () => {
    const user = userEvent.setup()

    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          { id: 'r2', shortcode: 'lola', is_active: true },
        ]}
      />
    )

    await user.selectOptions(
      screen.getByLabelText('Select URL for QR'),
      'http://localhost:3000/lola'
    )
    expect(screen.getByTestId('qr-url').textContent).toContain('/lola')
  })

  it('shows setup guidance when no active redirects exist', () => {
    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[]}
      />
    )

    expect(
      screen.getByText(/create and activate a short link/i)
    ).toBeInTheDocument()
  })

  it('shows setup guidance when every configured redirect is inactive', () => {
    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[
          { id: 'r1', shortcode: 'legacy-1', is_active: false },
          { id: 'r2', shortcode: 'legacy-2', is_active: false },
        ]}
      />
    )

    expect(screen.queryByTestId('qr-url')).not.toBeInTheDocument()
    expect(
      screen.getByText(/create and activate a short link/i)
    ).toBeInTheDocument()
  })

  it('excludes inactive redirects from qr selector options', () => {
    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          { id: 'r2', shortcode: 'legacy', is_active: false },
          { id: 'r3', shortcode: 'nanay', is_active: true },
        ]}
      />
    )

    const options = screen.getAllByRole('option')
    const labels = options.map((option) => option.textContent ?? '')
    expect(labels.some((label) => label.includes('/grandma'))).toBe(true)
    expect(labels.some((label) => label.includes('/nanay'))).toBe(true)
    expect(labels.some((label) => label.includes('/legacy'))).toBe(false)
  })

  it('prefers the configured short domain and hides the selector when only one active redirect exists', () => {
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = 'https://go.example.com/'

    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'classic',
          qr_caption: 'Scan me!',
        }}
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          { id: 'r2', shortcode: 'legacy', is_active: false },
        ]}
      />
    )

    expect(screen.queryByLabelText('Select URL for QR')).not.toBeInTheDocument()
    expect(screen.getByTestId('qr-url')).toHaveTextContent(
      'https://go.example.com/grandma'
    )
  })

  it('normalizes memorial qr props and labels verified redirects', () => {
    render(
      <AdminQRCodeSection
        memorial={
          {
            slug: 'jane',
            qr_template: 'unexpected',
            qr_caption: '   ',
            qr_show_logo: false,
          } as never
        }
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          {
            id: 'r2',
            shortcode: 'verified-jane',
            is_active: true,
            print_status: 'verified',
          },
        ]}
      />
    )

    const labels = screen
      .getAllByRole('option')
      .map((option) => option.textContent ?? '')
    expect(labels).toContain('Short: /verified-jane (verified)')
    expect(qrCodeGeneratorMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        template: 'classic',
        caption: 'Scan me!',
        showLogo: false,
      })
    )
  })

  it('uses the single active redirect without showing a selector and preserves enabled logo and warm template props', () => {
    process.env.NEXT_PUBLIC_SHORT_DOMAIN = 'https://go.example.com'

    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'warm',
          qr_caption: 'Remember always',
          qr_show_logo: true,
        }}
        redirects={[
          { id: 'r1', shortcode: 'family-jane', is_active: true },
          { id: 'r2', shortcode: 'old-link', is_active: false },
        ]}
      />
    )

    expect(screen.queryByLabelText('Select URL for QR')).not.toBeInTheDocument()
    expect(screen.getByTestId('qr-url')).toHaveTextContent(
      'https://go.example.com/family-jane'
    )
    expect(qrCodeGeneratorMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: 'https://go.example.com/family-jane',
        template: 'warm',
        caption: 'Remember always',
        showLogo: true,
      })
    )
  })

  it('forwards explicit qr styling props while using the window origin fallback', () => {
    render(
      <AdminQRCodeSection
        memorial={{
          slug: 'jane',
          qr_template: 'minimal',
          qr_caption: 'Remember softly',
          qr_foreground_color: '#14532d',
          qr_background_color: '#fffaf2',
          qr_frame_style: 'rounded',
          qr_caption_font: 'sans',
          qr_show_logo: true,
        }}
        redirects={[{ id: 'r1', shortcode: 'garden-path', is_active: true }]}
      />
    )

    expect(screen.queryByLabelText('Select URL for QR')).not.toBeInTheDocument()
    expect(qrCodeGeneratorMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3000/garden-path',
        template: 'minimal',
        caption: 'Remember softly',
        foregroundColor: '#14532d',
        backgroundColor: '#fffaf2',
        frameStyle: 'rounded',
        captionFont: 'sans',
        showLogo: true,
      })
    )
  })

  it('falls back to no redirect options and a default caption when redirects and caption are omitted at runtime', () => {
    render(
      <AdminQRCodeSection
        memorial={{ slug: 'jane' } as never}
        redirects={undefined as never}
      />
    )

    expect(screen.queryByTestId('qr-url')).not.toBeInTheDocument()
    expect(
      screen.getByText(/create and activate a short link/i)
    ).toBeInTheDocument()
  })
})
