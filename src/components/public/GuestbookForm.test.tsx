import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuestbookForm } from '@/components/public/GuestbookForm'

const insertMock = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}))

describe('GuestbookForm', () => {
  beforeEach(() => {
    insertMock.mockReset()
  })

  it('submits and shows success message', async () => {
    insertMock.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<GuestbookForm pageId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(insertMock).toHaveBeenCalledWith({
      page_id: 'page-1',
      name: 'Maria',
      message: 'Forever remembered',
    })
    expect(await screen.findByText('Thank you for sharing')).toBeInTheDocument()
  })

  it('shows API error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'Service unavailable' } })
    const user = userEvent.setup()

    render(<GuestbookForm pageId="page-1" />)

    await user.type(screen.getByLabelText('Your Name'), 'Maria')
    await user.type(screen.getByLabelText('Your Message'), 'Forever remembered')
    await user.click(screen.getByRole('button', { name: 'Post to Guestbook' }))

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument()
  })
})
