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
        page={{ slug: 'jane' }}
        redirects={[{ id: 'r1', shortcode: 'grandma' }]}
      />
    )

    expect(screen.getByTestId('qr-url').textContent).toContain('/r/grandma')
  })

  it('allows selecting another active redirect url', async () => {
    const user = userEvent.setup()

    render(
      <AdminQRCodeSection
        page={{ slug: 'jane' }}
        redirects={[
          { id: 'r1', shortcode: 'grandma', is_active: true },
          { id: 'r2', shortcode: 'lola', is_active: true },
        ]}
      />
    )

    await user.selectOptions(screen.getByLabelText('Select URL for QR'), 'http://localhost:3000/r/lola')
    expect(screen.getByTestId('qr-url').textContent).toContain('/r/lola')
  })

  it('shows setup guidance when no active redirects exist', () => {
    render(<AdminQRCodeSection page={{ slug: 'jane' }} redirects={[]} />)

    expect(screen.getByText(/create and activate a short link/i)).toBeInTheDocument()
  })
})
