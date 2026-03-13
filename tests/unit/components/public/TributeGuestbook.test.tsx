import { render, screen } from '@testing-library/react'
import { TributeGuestbook } from '@/components/public/TributeGuestbook'

vi.mock('@/components/public/GuestbookForm', () => ({
  GuestbookForm: ({ memorialId }: { memorialId: string }) => (
    <div data-testid="guestbook-form">{memorialId}</div>
  ),
}))

describe('TributeGuestbook', () => {
  it('renders empty state and form', () => {
    render(<TributeGuestbook memorialId="p1" fullName="Jane" entries={[]} />)

    expect(screen.getByTestId('guestbook-form')).toHaveTextContent('p1')
    expect(
      screen.getByText('No messages have been published yet.')
    ).toBeInTheDocument()
  })

  it('renders guestbook entries', () => {
    render(
      <TributeGuestbook
        memorialId="p1"
        fullName="Jane"
        entries={[
          {
            id: 'g1',
            name: 'Ana',
            message: 'We miss you',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
      />
    )

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText(/We miss you/)).toBeInTheDocument()
    expect(screen.getByText('January 1, 2026')).toBeInTheDocument()
  })

  it('falls back to generic loved-one copy when the memorial name is missing', () => {
    render(<TributeGuestbook memorialId="p2" fullName={null} entries={[]} />)

    expect(
      screen.getByText('Leave a message in memory of our loved one.')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /You can be the first to leave a memory for this loved one\./
      )
    ).toBeInTheDocument()
  })
})
