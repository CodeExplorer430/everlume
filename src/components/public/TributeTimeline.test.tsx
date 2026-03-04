import { render, screen } from '@testing-library/react'
import { TributeTimeline } from '@/components/public/TributeTimeline'

describe('TributeTimeline', () => {
  it('shows empty state', () => {
    render(<TributeTimeline timeline={[]} />)
    expect(screen.getByText('No timeline events shared yet.')).toBeInTheDocument()
  })

  it('renders timeline events', () => {
    render(
      <TributeTimeline
        timeline={[
          { id: '1', year: 1992, text: 'Born in Manila' },
          { id: '2', year: 2020, text: 'Retired from service' },
        ]}
      />
    )

    expect(screen.getByText('Born in Manila')).toBeInTheDocument()
    expect(screen.getByText('Retired from service')).toBeInTheDocument()
    expect(screen.getByText('1992')).toBeInTheDocument()
  })
})
