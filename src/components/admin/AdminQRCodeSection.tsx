'use client'

import { useMemo, useState } from 'react'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'

interface PageRecord {
  slug: string
  qr_template?: 'classic' | 'minimal' | 'warm'
  qr_caption?: string
}

interface RedirectRecord {
  id: string
  shortcode: string
  is_active?: boolean
  print_status?: 'unverified' | 'verified'
}

interface AdminQRCodeSectionProps {
  page: PageRecord
  redirects: RedirectRecord[]
}

export function AdminQRCodeSection({ page, redirects }: AdminQRCodeSectionProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>('')

  const options = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SHORT_DOMAIN || window.location.origin
    const redirectOptions = (redirects || [])
      .filter((r) => r.is_active !== false)
      .map((r) => ({
      key: r.id,
      label: `Short: /r/${r.shortcode}${r.print_status === 'verified' ? ' (verified)' : ''}`,
      value: `${baseUrl}/r/${r.shortcode}`,
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
              template={page.qr_template === 'minimal' || page.qr_template === 'warm' ? page.qr_template : 'classic'}
              caption={(page.qr_caption || 'Scan me!').trim()}
            />
          </>
        ) : (
          <p className="w-full rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Create and activate a short link in Settings before generating a plaque QR for {page.slug}.
          </p>
        )}
      </div>
    </div>
  )
}
