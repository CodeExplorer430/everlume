'use client'

import { useMemo, useState } from 'react'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'

interface MemorialRecord {
  slug: string
  qr_template?: 'classic' | 'minimal' | 'warm'
  qr_caption?: string
  qr_foreground_color?: '#111827' | '#14532d' | '#7c2d12'
  qr_background_color?: '#ffffff' | '#f8fafc' | '#fffaf2'
  qr_frame_style?: 'line' | 'rounded' | 'double'
  qr_caption_font?: 'serif' | 'sans'
  qr_show_logo?: boolean
}

interface RedirectRecord {
  id: string
  shortcode: string
  is_active?: boolean
  print_status?: 'unverified' | 'verified'
}

interface AdminQRCodeSectionProps {
  memorial: MemorialRecord
  redirects: RedirectRecord[]
}

export function AdminQRCodeSection({ memorial, redirects }: AdminQRCodeSectionProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>('')

  const options = useMemo(() => {
    const baseUrl = (process.env.NEXT_PUBLIC_SHORT_DOMAIN || window.location.origin).replace(/\/+$/, '')
    const redirectOptions = (redirects || [])
      .filter((r) => r.is_active !== false)
      .map((r) => ({
      key: r.id,
      label: `Short: /${r.shortcode}${r.print_status === 'verified' ? ' (verified)' : ''}`,
      value: `${baseUrl}/${r.shortcode}`,
      }))

    return redirectOptions
  }, [redirects])

  const qrUrl = selectedUrl || options[0]?.value || ''

  return (
    <div className="surface-card space-y-4 p-6">
      <h3 className="border-b border-border pb-2 text-base font-semibold">QR Code for Plaque</h3>
      <div className="flex flex-col items-center space-y-4">
        {options.length > 1 && (
          <div className="w-full">
            <label htmlFor="qr-url-selector" className="mb-1 block text-xs font-medium text-muted-foreground">
              Select URL for QR
            </label>
            <select
              id="qr-url-selector"
              className="w-full rounded-md border border-input bg-[var(--surface-1)] px-3 py-2 text-sm"
              value={qrUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {options.length > 0 ? (
          <>
            <p className="w-full rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              QR links are generated from your short-domain redirect codes only.
            </p>
            <QRCodeGenerator
              url={qrUrl}
              template={memorial.qr_template === 'minimal' || memorial.qr_template === 'warm' ? memorial.qr_template : 'classic'}
              caption={(memorial.qr_caption || 'Scan me!').trim()}
              foregroundColor={memorial.qr_foreground_color}
              backgroundColor={memorial.qr_background_color}
              frameStyle={memorial.qr_frame_style}
              captionFont={memorial.qr_caption_font}
              showLogo={memorial.qr_show_logo === true}
            />
          </>
        ) : (
          <p className="w-full rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Create and activate a short link in Settings before generating a plaque QR for {memorial.slug}.
          </p>
        )}
      </div>
    </div>
  )
}
