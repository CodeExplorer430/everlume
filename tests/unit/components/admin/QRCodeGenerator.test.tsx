import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'

const mockToString = vi.fn()
const mockToCanvas = vi.fn()

vi.mock('qrcode', () => ({
  default: {
    toString: (...args: unknown[]) => mockToString(...args),
    toCanvas: (...args: unknown[]) => mockToCanvas(...args),
  },
}))

describe('QRCodeGenerator', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockToString.mockReset()
    mockToCanvas.mockReset()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qr')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock')
  })

  it('generates svg/canvas and supports SVG/PNG downloads', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(null, '<svg><rect /></svg>')
    })

    const user = userEvent.setup()
    render(<QRCodeGenerator url="https://example.com/r/jane" template="warm" caption="Remember me" />)

    await waitFor(() => {
      expect(mockToString).toHaveBeenCalledWith(
        'https://example.com/r/jane',
        expect.objectContaining({ type: 'svg' }),
        expect.any(Function)
      )
    })
    expect(mockToCanvas).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Download SVG/i }))
    expect(URL.createObjectURL).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Download PNG/i }))
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png')
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })

  it('keeps qr container rendered when svg generation fails', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(new Error('generation failed'), '')
    })

    render(<QRCodeGenerator url="https://example.com/r/jane" template="minimal" caption="Visit memorial" />)

    await waitFor(() => {
      expect(mockToString).toHaveBeenCalled()
    })
    expect(screen.getByText('https://example.com/r/jane')).toBeInTheDocument()
  })
})
