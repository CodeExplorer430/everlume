import { render, screen } from '@testing-library/react'
import { TributeList } from '@/components/admin/TributeList'

describe('TributeList', () => {
  it('renders empty state', () => {
    render(<TributeList pages={[]} />)

    expect(screen.getByText('No memorials created yet.')).toBeInTheDocument()
  })

  it('renders memorial items with view and edit links', () => {
    render(
      <TributeList
        pages={[
          {
            id: 'page-1',
            title: 'In Loving Memory',
            slug: 'jane-doe',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]}
      />
    )

    expect(screen.getByText('In Loving Memory')).toBeInTheDocument()
    expect(screen.getByText('Your Memorials')).toBeInTheDocument()
    expect(screen.getByText('/memorials/jane-doe')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View/i })).toHaveAttribute('href', '/memorials/jane-doe')
    expect(screen.getByRole('link', { name: /Edit/i })).toHaveAttribute('href', '/admin/memorials/page-1')
  })
})
