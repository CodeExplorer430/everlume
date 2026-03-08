import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewMemorialForm } from '@/components/pages/admin/NewMemorialForm'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}))

describe('NewMemorialForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockBack.mockReset()
  })

  it('auto-generates slug from title and preserves manual slug override', async () => {
    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'In Loving Memory')
    expect(screen.getByLabelText('URL Slug')).toHaveValue('in-loving-memory')

    await user.clear(screen.getByLabelText('URL Slug'))
    await user.type(screen.getByLabelText('URL Slug'), 'custom-slug')

    await user.clear(screen.getByLabelText('Memorial Title'))
    await user.type(screen.getByLabelText('Memorial Title'), 'Changed Title')
    expect(screen.getByLabelText('URL Slug')).toHaveValue('custom-slug')
  })

  it('submits and navigates to admin on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ page: { id: 'p1' } }), { status: 200 }))

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/memorials',
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(mockPush).toHaveBeenCalledWith('/admin')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows API error and supports cancel navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Creation failed' }), { status: 500 }))

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(await screen.findByText('Creation failed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockBack).toHaveBeenCalled()
  })
})
