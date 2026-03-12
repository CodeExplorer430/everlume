import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorialActionBar } from '@/components/public/MemorialActionBar'

describe('MemorialActionBar', () => {
  const originalShare = navigator.share
  const originalClipboard = navigator.clipboard
  const originalPrint = window.print
  const originalHref = window.location.href

  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/memorials/jane-doe')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalShare,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
    window.print = originalPrint
    window.history.replaceState({}, '', originalHref)
  })

  it('uses the native share sheet when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    })

    const user = userEvent.setup()
    render(
      <MemorialActionBar
        memorialTitle="In Loving Memory of Jane Doe"
        guestbookHref="#guestbook"
      />
    )

    await user.click(screen.getByRole('button', { name: /share/i }))

    expect(shareMock).toHaveBeenCalledWith({
      title: 'In Loving Memory of Jane Doe',
      text: 'Visit this memorial for In Loving Memory of Jane Doe.',
      url: 'http://localhost:3000/memorials/jane-doe',
    })
    expect(
      screen.getByText('Share options opened on this device.')
    ).toBeInTheDocument()
  })

  it('copies the memorial link when clipboard access is available', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })

    const user = userEvent.setup()
    const writeTextMock = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    render(
      <MemorialActionBar
        memorialTitle="In Loving Memory of Jane Doe"
        guestbookHref="#guestbook"
      />
    )

    await user.click(screen.getByRole('button', { name: /copy link/i }))

    expect(writeTextMock).toHaveBeenCalledWith(
      'http://localhost:3000/memorials/jane-doe'
    )
    expect(
      screen.getByText('Memorial link copied. You can paste it anywhere.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /leave a message/i })
    ).toHaveAttribute('href', '#guestbook')
  })

  it('prints the memorial when print action is pressed', async () => {
    window.print = vi.fn()

    const user = userEvent.setup()
    render(
      <MemorialActionBar
        memorialTitle="In Loving Memory of Jane Doe"
        guestbookHref="#guestbook"
      />
    )

    await user.click(screen.getByRole('button', { name: /print memorial/i }))

    expect(window.print).toHaveBeenCalled()
    expect(screen.getByText(/Print dialog opened/i)).toBeInTheDocument()
  })

  it('treats native share cancel as a non-error state', async () => {
    const abortError = new Error('Canceled')
    abortError.name = 'AbortError'
    const shareMock = vi.fn().mockRejectedValue(abortError)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    })

    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Sharing was canceled before anything was sent.')
      ).toBeInTheDocument()
    })
  })

  it('surfaces clipboard failure with fallback guidance', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })

    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    )
    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /copy link/i }))

    expect(
      screen.getByText(
        'Copy link failed. Please copy the address from your browser instead.'
      )
    ).toBeInTheDocument()
  })

  it('falls back to clipboard when native share fails for another reason', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('unavailable'))
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    })
    const user = userEvent.setup()
    const writeTextMock = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /^share$/i }))

    expect(writeTextMock).toHaveBeenCalledWith(
      'http://localhost:3000/memorials/jane-doe'
    )
    expect(
      screen.getByText('Memorial link copied. You can paste it anywhere.')
    ).toBeInTheDocument()
  })

  it('surfaces fallback guidance when share and clipboard both fail', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('no share')),
    })
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    )
    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    await user.click(screen.getByRole('button', { name: /^share$/i }))

    expect(
      screen.getByText(
        'Sharing is unavailable right now. Please copy the address from your browser.'
      )
    ).toBeInTheDocument()
  })

  it('shows the device fallback when share and clipboard are both unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => undefined,
    })

    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Sharing is unavailable on this device.')
      ).toBeInTheDocument()
    })
  })

  it('shows the copy-link unavailable message when clipboard access is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => undefined,
    })

    render(<MemorialActionBar memorialTitle="In Loving Memory of Jane Doe" />)

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Copy link is unavailable on this device.')
      ).toBeInTheDocument()
    })
  })
})
