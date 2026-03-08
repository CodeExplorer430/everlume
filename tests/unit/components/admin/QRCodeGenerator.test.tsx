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
    const svgBlob = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0] as Blob
    await expect(svgBlob.text()).resolves.toContain('Remember me')

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

  it('falls back to the hidden canvas data url when export context is unavailable', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(null, '<svg><rect /></svg>')
    })

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      if (this.width === 1800 && this.height === 2400) return null
      return originalGetContext.call(this, '2d')
    })

    const user = userEvent.setup()
    render(<QRCodeGenerator url="https://example.com/r/jane" template="classic" caption="Visit memorial" showLogo />)

    await waitFor(() => {
      expect(mockToString).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: /Download PNG/i }))
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png')
  })

  it('includes double frame and logo markup in the exported svg template', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(null, '<svg><rect /></svg>')
    })

    const user = userEvent.setup()
    render(
      <QRCodeGenerator
        url="https://example.com/r/lola"
        template="warm"
        caption="For Lola"
        frameStyle="double"
        showLogo
      />
    )

    await waitFor(() => {
      expect(mockToString).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: /Download SVG/i }))
    const svgBlob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob
    const svgText = await svgBlob.text()
    expect(svgText).toContain('For Lola')
    expect(svgText).toContain('stroke-width="3"')
    expect(svgText).toContain('<circle')
  })

  it('renders the png export with logo and sans caption when canvas context is available', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(null, '<svg><rect /></svg>')
    })

    const arc = vi.fn()
    const fill = vi.fn()
    const stroke = vi.fn()
    const fillRect = vi.fn()
    const strokeRect = vi.fn()
    const drawImage = vi.fn()
    const fillText = vi.fn()
    const exportContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: '',
      font: '',
      fillRect,
      strokeRect,
      drawImage,
      fillText,
      beginPath: vi.fn(),
      arc,
      fill,
      stroke,
    }

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      if (this.width === 1800 && this.height === 2400) return exportContext as unknown as CanvasRenderingContext2D
      return originalGetContext.call(this, '2d')
    })

    const user = userEvent.setup()
    render(
      <QRCodeGenerator
        url="https://example.com/r/lola"
        template="minimal"
        caption="Visit tribute"
        frameStyle="double"
        captionFont="sans"
        showLogo
      />
    )

    await waitFor(() => {
      expect(mockToString).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: /Download PNG/i }))
    expect(fillRect).toHaveBeenCalled()
    expect(strokeRect).toHaveBeenCalledTimes(2)
    expect(drawImage).toHaveBeenCalled()
    expect(arc).toHaveBeenCalledWith(900, 1740, 62, 0, Math.PI * 2)
    expect(fillText).toHaveBeenCalledWith('E', 900, 1760)
    expect(fillText).toHaveBeenCalledWith('Visit tribute', 900, 2260)
  })

  it('does not try to download an svg before qr markup is available', async () => {
    mockToString.mockImplementation((_: string, __: unknown, callback: (err: Error | null, svg: string) => void) => {
      callback(new Error('generation failed'), '')
    })

    const user = userEvent.setup()
    render(<QRCodeGenerator url="https://example.com/r/jane" template="minimal" caption="Visit memorial" />)

    await user.click(screen.getByRole('button', { name: /Download SVG/i }))
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
