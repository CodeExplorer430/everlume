import { render, screen, waitFor } from '@testing-library/react'
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

  it('keeps slug in sync while it still matches the generated title slug', async () => {
    const user = userEvent.setup()
    render(<NewMemorialForm />)

    const titleInput = screen.getByLabelText('Memorial Title')
    const slugInput = screen.getByLabelText('URL Slug')

    await user.type(titleInput, 'Jane Doe')
    expect(slugInput).toHaveValue('jane-doe')

    await user.clear(titleInput)
    await user.type(titleInput, 'Jane Doe Senior')
    expect(slugInput).toHaveValue('jane-doe-senior')
  })

  it('submits and navigates to admin on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ memorial: { id: 'p1' } }), {
        status: 200,
      })
    )

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe')
    await user.type(
      screen.getByLabelText('Dedication Text'),
      'Beloved by her family and church community.'
    )
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/memorials',
      expect.objectContaining({
        method: 'POST',
      })
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      dedicationText: 'Beloved by her family and church community.',
    })
    expect(mockPush).toHaveBeenCalledWith('/admin')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('normalizes empty dates to null and shows the creating state while the request is pending', async () => {
    let resolveRequest:
      | ((value: Response | PromiseLike<Response>) => void)
      | undefined

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }) as Promise<Response>
    )

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      dob: null,
      dod: null,
    })

    resolveRequest?.(
      new Response(JSON.stringify({ memorial: { id: 'p1' } }), { status: 200 })
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin')
    })
  })

  it('shows API error and supports cancel navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Creation failed' }), {
        status: 500,
      })
    )

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(await screen.findByText('Creation failed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockBack).toHaveBeenCalled()
  })

  it('falls back to the default create error when the response is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('server unavailable', { status: 500 })
    )

    const user = userEvent.setup()
    render(<NewMemorialForm />)

    await user.type(screen.getByLabelText('Memorial Title'), 'Jane Doe')
    await user.type(screen.getByLabelText('URL Slug'), 'jane-doe')
    await user.click(screen.getByRole('button', { name: 'Create Memorial' }))

    expect(
      await screen.findByText('Unable to create memorial.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create Memorial' })
    ).toBeEnabled()
  })
})
