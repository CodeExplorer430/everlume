'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, MessageSquareMore, Printer, Share2 } from 'lucide-react'

interface MemorialActionBarProps {
  memorialTitle: string
  guestbookHref?: string
}

export function MemorialActionBar({ memorialTitle, guestbookHref }: MemorialActionBarProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleShare = async () => {
    const shareUrl = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: memorialTitle,
          text: `Visit this memorial for ${memorialTitle}.`,
          url: shareUrl,
        })
        setStatusMessage('Share options opened on this device.')
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setStatusMessage('Sharing was canceled before anything was sent.')
          return
        }
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setStatusMessage('Memorial link copied. You can paste it anywhere.')
        return
      }
    } catch {
      setStatusMessage('Sharing is unavailable right now. Please copy the address from your browser.')
      return
    }

    setStatusMessage('Sharing is unavailable on this device.')
  }

  const handleCopyLink = async () => {
    const shareUrl = window.location.href
    if (!navigator.clipboard?.writeText) {
      setStatusMessage('Copy link is unavailable on this device.')
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setStatusMessage('Memorial link copied. You can paste it anywhere.')
    } catch {
      setStatusMessage('Copy link failed. Please copy the address from your browser instead.')
    }
  }

  const handlePrint = () => {
    window.print()
    setStatusMessage('Print dialog opened. Choose Save as PDF for a keepsake copy.')
  }

  return (
    <section
      className="memorial-action-bar surface-card mx-auto max-w-5xl border border-border/70 px-4 py-4 md:px-6"
      aria-label="Memorial actions"
      data-print-hide="true"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="section-kicker">Visitor Actions</p>
          <p className="text-sm text-muted-foreground">
            Share this memorial, save a printable keepsake, or move directly to the guestbook.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleShare()}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print memorial
          </Button>
          {guestbookHref ? (
            <Button variant="ghost" asChild>
              <Link href={guestbookHref}>
                <MessageSquareMore className="h-4 w-4" />
                Leave a message
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}
