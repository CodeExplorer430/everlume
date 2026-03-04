import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineEditor } from '@/components/admin/TimelineEditor'

const insertMock = vi.fn()
const deleteEqMock = vi.fn()

function createTimelineQuery(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data }),
    insert: insertMock,
    delete: vi.fn(() => ({ eq: deleteEqMock })),
  }
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'timeline_events') {
        return createTimelineQuery([{ id: 't1', year: 1990, text: 'Born' }])
      }
      return createTimelineQuery([])
    },
  }),
}))

describe('TimelineEditor', () => {
  beforeEach(() => {
    insertMock.mockReset()
    deleteEqMock.mockReset()
  })

  it('renders current timeline events', async () => {
    render(<TimelineEditor pageId="page-1" />)
    expect(await screen.findByText('Born')).toBeInTheDocument()
  })

  it('inserts event', async () => {
    insertMock.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<TimelineEditor pageId="page-1" />)

    await screen.findByText('Born')
    await user.type(screen.getByPlaceholderText('Year'), '2001')
    await user.type(screen.getByPlaceholderText('Event description...'), 'Started university')
    await user.click(screen.getByRole('button', { name: /add timeline event/i }))

    expect(insertMock).toHaveBeenCalledWith({
      page_id: 'page-1',
      year: 2001,
      text: 'Started university',
    })
  })
})
