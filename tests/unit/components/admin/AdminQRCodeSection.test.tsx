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

    expect(screen.getByTestId('qr-url').textContent).toContain('/grandma')
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
})
