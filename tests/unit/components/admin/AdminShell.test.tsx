import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminShell } from '@/components/admin/AdminShell'

let mockPathname = '/admin'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('AdminShell', () => {
  beforeEach(() => {
    mockPathname = '/admin'
  })

  it('renders children and user email', () => {
    render(
      <AdminShell userEmail="admin@example.com">
        <div>Child Content</div>
      </AdminShell>
    )

    expect(screen.getByText('Child Content')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('toggles mobile menu button', async () => {
    const user = userEvent.setup()
    render(
      <AdminShell userEmail="admin@example.com">
        <div>Child Content</div>
      </AdminShell>
    )

    const toggle = screen.getByRole('button', {
      name: /toggle navigation menu/i,
    })
    await user.click(toggle)
    expect(screen.getByText('Create Memorial')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('highlights the nested active route and leaves dashboard inactive', () => {
    mockPathname = '/admin/settings/redirects'

    render(
      <AdminShell userEmail="admin@example.com">
        <div>Child Content</div>
      </AdminShell>
    )

    expect(screen.getByRole('link', { name: /short links/i })).toHaveClass(
      'bg-primary/14'
    )
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveClass(
      'bg-primary/14'
    )
  })

  it('closes the mobile menu after selecting a navigation link', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AdminShell userEmail="admin@example.com">
        <div>Child Content</div>
      </AdminShell>
    )

    const toggle = screen.getByRole('button', {
      name: /toggle navigation menu/i,
    })
    await user.click(toggle)

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('block')

    await user.click(screen.getByRole('link', { name: /create memorial/i }))

    expect(aside).toHaveClass('hidden')
    expect(aside).toHaveClass('md:block')
  })

  it('renders the shell without a visible email when no user email is provided', () => {
    render(
      <AdminShell>
        <div>Child Content</div>
      </AdminShell>
    )

    expect(
      screen.getByRole('button', { name: /sign out/i })
    ).toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })
})
