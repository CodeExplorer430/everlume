'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ProtectedMediaConsentGateProps {
  slug: string
  title?: string
  body?: string
  version?: number
}

export function ProtectedMediaConsentGate({ slug, title = 'Media Viewing Notice', body, version = 1 }: ProtectedMediaConsentGateProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConsent = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    const response = await fetch(`/api/public/memorials/${slug}/media-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to confirm media consent right now.')
      setSubmitting(false)
      return
    }

    window.location.reload()
  }

  return (
    <section className="surface-card mx-auto max-w-3xl space-y-4 px-6 py-8 text-center md:px-10" data-print-hide="true">
      <p className="section-kicker">Protected Media</p>
      <h2 className="section-title mt-2">{title}</h2>
      <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {body ||
          "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight."}
      </p>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Consent version {version}</p>

      {errorMessage && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button onClick={handleConsent} disabled={submitting}>
        {submitting ? 'Confirming...' : 'Continue to Protected Media'}
      </Button>
    </section>
  )
}
