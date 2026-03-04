import { render, screen } from '@testing-library/react'
import { TributeGuestbook } from '@/components/public/TributeGuestbook'

vi.mock('@/components/public/GuestbookForm', () => ({
  GuestbookForm: ({ pageId }: { pageId: string }) => <div data-testid="guestbook-form">{pageId}</div>,
}))

describe('TributeGuestbook', () => {
  it('renders empty state and form', () => {
    render(<TributeGuestbook pageId="p1" fullName="Jane" entries={[]} />)

    expect(screen.getByTestId('guestbook-form')).toHaveTextContent('p1')
    expect(screen.getByText('No messages yet. Be the first to share a memory.')).toBeInTheDocument()
  })

  it('renders guestbook entries', () => {
    render(
      <TributeGuestbook
        pageId="p1"
        fullName="Jane"
        entries={[{ id: 'g1', name: 'Ana', message: 'We miss you', created_at: '2026-01-01T00:00:00Z' }]}
      />
    )

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText(/We miss you/)).toBeInTheDocument()
  })
})
