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
        width: 1200, // High resolution for printing
        margin: 2,
        errorCorrectionLevel: 'H',
      })
    }
  }, [url])

  const downloadSVG = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tribute-qr-${url.split('/').pop()}.svg`
    link.click()
  }

  const downloadPNG = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.href = canvasRef.current.toDataURL('image/png')
    link.download = `tribute-qr-${url.split('/').pop()}.png`
    link.click()
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div 
        className="w-48 h-48 border border-gray-200 rounded-lg p-2 bg-white"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="grid grid-cols-1 w-full gap-2">
        <Button variant="outline" size="sm" onClick={downloadSVG}>
          <Download className="mr-2 h-4 w-4" />
          Download SVG (Vector)
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPNG}>
          <Download className="mr-2 h-4 w-4" />
          Download PNG (300+ DPI)
        </Button>
      </div>
      {/* Hidden canvas for PNG generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <p className="text-[10px] text-gray-400 text-center">
        Vector (SVG) is recommended for engraving.
      </p>
    </div>
  )
}
