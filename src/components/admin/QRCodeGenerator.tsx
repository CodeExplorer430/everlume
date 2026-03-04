'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface QRCodeGeneratorProps {
  url: string
}

export function QRCodeGenerator({ url }: QRCodeGeneratorProps) {
  const [svg, setSvg] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H' }, (err, string) => {
      if (!err) setSvg(string)
    })

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 1200,
        margin: 2,
        errorCorrectionLevel: 'H',
      })
    }
  }, [url])

  const downloadSVG = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `everlume-qr-${url.split('/').pop()}.svg`
    link.click()
  }

  const downloadPNG = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.href = canvasRef.current.toDataURL('image/png')
    link.download = `everlume-qr-${url.split('/').pop()}.png`
    link.click()
  }

  return (
    <div className="w-full space-y-3 text-center">
      <div className="mx-auto w-fit rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-card)]" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs font-mono text-muted-foreground">{url}</p>
      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" size="sm" onClick={downloadSVG}>
          <Download className="mr-2 h-4 w-4" />
          Download SVG (Vector)
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPNG}>
          <Download className="mr-2 h-4 w-4" />
          Download PNG (300+ DPI)
        </Button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <p className="text-[11px] text-muted-foreground">SVG is best for engraving vendors.</p>
    </div>
  )
}
