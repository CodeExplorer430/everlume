import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-destructive')
  })

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button', { name: 'Large' }).className).toContain('h-12')
  })

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/admin">Go</a>
      </Button>
    )

    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/admin')
  })
})
