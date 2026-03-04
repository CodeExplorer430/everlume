/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'

interface AdminQRCodeSectionProps {
  page: any
  redirects: any[]
}

export function AdminQRCodeSection({ page, redirects }: AdminQRCodeSectionProps) {
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SHORT_DOMAIN || window.location.origin
    let newUrl = ''
    if (redirects && redirects.length > 0) {
      newUrl = `${baseUrl}/r/${redirects[0].shortcode}`
    } else {
      newUrl = `${baseUrl}/pages/${page.slug}`
    }

    if (newUrl && qrUrl !== newUrl) {
        setQrUrl(newUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.slug, redirects])

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border space-y-4">
      <h3 className="font-semibold text-foreground border-b border-border pb-2 mb-4">QR Code for Plaque</h3>
      <div className="flex flex-col items-center space-y-4">
          {redirects.length > 0 && (
            <div className="w-full">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Select URL for QR</label>
              <select 
              className="w-full text-sm bg-background border-input text-foreground rounded-md shadow-sm focus:border-primary focus:ring-primary"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              >
                {redirects.map((r: any) => (
                  <option key={r.id} value={`${process.env.NEXT_PUBLIC_SHORT_DOMAIN || window.location.origin}/r/${r.shortcode}`}>
                    Short: /r/{r.shortcode}
                  </option>
                ))}
                <option value={`${process.env.NEXT_PUBLIC_SHORT_DOMAIN || window.location.origin}/pages/${page.slug}`}>
                  Direct: /pages/{page.slug}
                </option>
              </select>
            </div>
          )}
          <QRCodeGenerator url={qrUrl} />
      </div>
    </div>
  )
}
