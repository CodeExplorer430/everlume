import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminShell } from '@/components/admin/AdminShell'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
}))

describe('AdminShell', () => {
  it('renders children and user email', () => {
    render(<AdminShell userEmail="admin@example.com"><div>Child Content</div></AdminShell>)

    expect(screen.getByText('Child Content')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('toggles mobile menu button', async () => {
    const user = userEvent.setup()
    render(<AdminShell userEmail="admin@example.com"><div>Child Content</div></AdminShell>)

    const toggle = screen.getByRole('button', { name: '' })
    await user.click(toggle)
    expect(screen.getByText('Create Tribute')).toBeInTheDocument()
  })
})
