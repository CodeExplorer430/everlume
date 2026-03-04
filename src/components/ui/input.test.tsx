import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('accepts typing', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="name" />)
    const input = screen.getByLabelText('name')
    await user.type(input, 'Jane')
    expect(input).toHaveValue('Jane')
  })

  it('honors disabled', () => {
    render(<Input aria-label="disabled" disabled />)
    expect(screen.getByLabelText('disabled')).toBeDisabled()
  })
})
