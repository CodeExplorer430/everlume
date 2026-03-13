'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface QRCodeGeneratorProps {
  url: string
  template?: 'classic' | 'minimal' | 'warm'
  caption?: string
  foregroundColor?: '#111827' | '#14532d' | '#7c2d12'
  backgroundColor?: '#ffffff' | '#f8fafc' | '#fffaf2'
  frameStyle?: 'line' | 'rounded' | 'double'
  captionFont?: 'serif' | 'sans'
  showLogo?: boolean
}

export function QRCodeGenerator({
  url,
  template = 'classic',
  caption = 'Scan me!',
  foregroundColor = '#111827',
  backgroundColor = '#ffffff',
  frameStyle = 'line',
  captionFont = 'serif',
  showLogo = false,
}: QRCodeGeneratorProps) {
  const [svg, setSvg] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    QRCode.toString(
      url,
      {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 3,
        width: 1400,
        color: { dark: foregroundColor, light: backgroundColor },
      },
      (err, string) => {
        if (!err) setSvg(string)
      }
    )

    QRCode.toCanvas(canvasRef.current!, url, {
      width: 1400,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: foregroundColor, light: backgroundColor },
    })
  }, [url, foregroundColor, backgroundColor])

  const buildPlaqueSvg = () => {
    if (!svg) return ''
    const palette =
      template === 'minimal'
        ? { bg: '#ffffff', frame: '#1f2937', text: '#111827' }
        : template === 'warm'
          ? { bg: '#fffaf2', frame: '#7b5a36', text: '#503a23' }
          : { bg: '#ffffff', frame: '#101010', text: '#111111' }
    const captionFontStyle =
      captionFont === 'sans'
        ? "normal 145px 'Helvetica Neue', Arial, sans-serif"
        : "italic 170px 'Times New Roman', Georgia, serif"
    const frameStrokeWidth = frameStyle === 'double' ? 8 : 4
    const frameRadius = frameStyle === 'rounded' ? 48 : 24

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2400" viewBox="0 0 1800 2400">
  <rect width="1800" height="2400" fill="${palette.bg}"/>
  <rect x="120" y="120" width="1560" height="1920" rx="${frameRadius}" fill="${palette.bg}" stroke="${palette.frame}" stroke-width="${frameStrokeWidth}"/>
  ${frameStyle === 'double' ? `<rect x="150" y="150" width="1500" height="1860" rx="${Math.max(24, frameRadius - 8)}" fill="none" stroke="${palette.frame}" stroke-width="3"/>` : ''}
  <g transform="translate(200,220)">
    ${svg}
  </g>
  ${showLogo ? '<circle cx="900" cy="1740" r="62" fill="#ffffff" stroke="#d4d4d8" stroke-width="3"/><text x="900" y="1762" text-anchor="middle" font="700 54px Georgia, serif" fill="#4b5563">E</text>' : ''}
  <text x="900" y="2260" text-anchor="middle" font="${captionFontStyle}" fill="${palette.text}">${caption}</text>
</svg>`.trim()
  }

  const downloadSVG = () => {
    const plaqueSvg = buildPlaqueSvg()
    if (!plaqueSvg) return
    const blob = new Blob([plaqueSvg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `everlume-qr-print-${url.split('/').pop()}.svg`
    link.click()
  }

  const downloadPNG = () => {
    const qrCanvas = canvasRef.current!
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = 1800
    exportCanvas.height = 2400
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) {
      const link = document.createElement('a')
      link.href = qrCanvas.toDataURL('image/png')
      link.download = `everlume-qr-print-2048-${url.split('/').pop()}.png`
      link.click()
      return
    }

    const palette =
      template === 'minimal'
        ? { bg: '#ffffff', frame: '#1f2937', text: '#111827' }
        : template === 'warm'
          ? { bg: '#fffaf2', frame: '#7b5a36', text: '#503a23' }
          : { bg: '#ffffff', frame: '#101010', text: '#111111' }

    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

    ctx.strokeStyle = palette.frame
    ctx.lineWidth = frameStyle === 'double' ? 8 : 4
    ctx.strokeRect(120, 120, 1560, 1920)
    if (frameStyle === 'double') {
      ctx.lineWidth = 3
      ctx.strokeRect(150, 150, 1500, 1860)
    }

    ctx.drawImage(qrCanvas, 200, 220, 1400, 1400)
    ctx.fillStyle = palette.text
    ctx.textAlign = 'center'
    ctx.font =
      captionFont === 'sans'
        ? "normal 145px 'Helvetica Neue', Arial, sans-serif"
        : "italic 170px 'Times New Roman', Georgia, serif"
    if (showLogo) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(900, 1740, 62, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#d4d4d8'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#4b5563'
      ctx.font = '700 54px Georgia, serif'
      ctx.fillText('E', 900, 1760)
      ctx.fillStyle = palette.text
    }
    ctx.fillText(caption, 900, 2260)

    const link = document.createElement('a')
    link.href = exportCanvas.toDataURL('image/png')
    link.download = `everlume-qr-print-2048-${url.split('/').pop()}.png`
    link.click()
  }

  return (
    <div className="w-full space-y-3 text-center">
      <div className="mx-auto w-fit rounded-xl border border-border bg-white px-6 py-6 shadow-[var(--shadow-card)]">
        <div
          className="mx-auto w-fit"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="pt-5 text-5xl italic text-foreground [font-family:Georgia,'Times_New_Roman',serif]">
          {caption}
        </p>
      </div>
      <p className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs font-mono text-muted-foreground">
        {url}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" size="sm" onClick={downloadSVG}>
          <Download className="mr-2 h-4 w-4" />
          Download SVG (Engraving Safe)
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPNG}>
          <Download className="mr-2 h-4 w-4" />
          Download PNG (2048px Print)
        </Button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <p className="text-[11px] text-muted-foreground">
        Use SVG for engravers. Use 2048px PNG for print shops.
      </p>
    </div>
  )
}
