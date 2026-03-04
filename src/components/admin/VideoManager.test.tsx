import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoManager } from '@/components/admin/VideoManager'

const insertMock = vi.fn()
const deleteMock = vi.fn()

function createVideoQuery(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data }),
    insert: insertMock,
    delete: vi.fn(() => ({ eq: deleteMock })),
  }
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'videos') return createVideoQuery([{ id: '1', provider_id: 'abcdefghijk', title: 'Clip' }])
      return createVideoQuery([])
    },
  }),
}))

describe('VideoManager', () => {
  beforeEach(() => {
    insertMock.mockReset()
    deleteMock.mockReset()
  })

  it('renders policy notice and existing videos', async () => {
    render(<VideoManager pageId="page-1" />)

    expect(await screen.findByText(/Upload videos to YouTube first/)).toBeInTheDocument()
    expect(await screen.findByText('Clip')).toBeInTheDocument()
  })

  it('inserts valid youtube video', async () => {
    insertMock.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<VideoManager pageId="page-1" />)

    await screen.findByText(/Upload videos to YouTube first/)
    await user.type(screen.getByPlaceholderText(/YouTube URL/), 'https://www.youtube.com/watch?v=abcdefghijk')
    await user.type(screen.getByPlaceholderText(/Video Title/), 'Memorial Video')
    await user.click(screen.getByRole('button', { name: /add video/i }))

    expect(insertMock).toHaveBeenCalledWith({
      page_id: 'page-1',
      provider: 'youtube',
      provider_id: 'abcdefghijk',
      title: 'Memorial Video',
    })
  })
})
