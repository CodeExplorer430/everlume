import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminQRCodeSection } from '@/components/admin/AdminQRCodeSection'

vi.mock('@/components/admin/QRCodeGenerator', () => ({
  QRCodeGenerator: ({ url }: { url: string }) => <div data-testid="qr-url">{url}</div>,
}))

describe('AdminQRCodeSection', () => {
  it('uses first redirect by default', () => {
    render(
      <AdminQRCodeSection
        page={{ slug: 'jane', qr_template: 'classic', qr_caption: 'Scan me!' }}
        redirects={[{ id: 'r1', shortcode: 'grandma' }]}
      />
    )

    expect(screen.getByTestId('qr-url').textContent).toContain('/grandma')
  })

  it('allows selecting another active redirect url', async () => {
    const user = userEvent.setup()

    render(
      <AdminQRCodeSection
        page={{ slug: 'jane', qr_template: 'classic', qr_caption: 'Scan me!' }}
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          { id: 'r2', shortcode: 'lola', is_active: true },
        ]}
      />
    )

    await user.selectOptions(screen.getByLabelText('Select URL for QR'), 'http://localhost:3000/lola')
    expect(screen.getByTestId('qr-url').textContent).toContain('/lola')
  })

  it('shows setup guidance when no active redirects exist', () => {
    render(<AdminQRCodeSection page={{ slug: 'jane', qr_template: 'classic', qr_caption: 'Scan me!' }} redirects={[]} />)

    expect(screen.getByText(/create and activate a short link/i)).toBeInTheDocument()
  })

  it('excludes inactive redirects from qr selector options', () => {
    render(
      <AdminQRCodeSection
        page={{ slug: 'jane', qr_template: 'classic', qr_caption: 'Scan me!' }}
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
})
