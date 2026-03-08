'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GuestbookFormProps {
  memorialId?: string
  pageId?: string
}

type TurnstileWidgetId = string | number

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => TurnstileWidgetId
      reset: (widgetId?: TurnstileWidgetId) => void
      remove?: (widgetId: TurnstileWidgetId) => void
    }
  }
}

export function GuestbookForm({ memorialId, pageId }: GuestbookFormProps) {
  const resolvedMemorialId = memorialId || pageId || ''
  const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()
  const shouldUseCaptcha = turnstileSiteKey.length > 0
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<TurnstileWidgetId | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (!shouldUseCaptcha || !turnstileReady || !window.turnstile) return
    const container = turnstileContainerRef.current
    if (!container || turnstileWidgetIdRef.current) return

    turnstileWidgetIdRef.current = window.turnstile.render(container, {
      sitekey: turnstileSiteKey,
      callback: (token) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken(null),
      'error-callback': () => {
        setCaptchaToken(null)
        setError('Captcha failed to load. Please refresh and try again.')
      },
    })

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current)
      }
      turnstileWidgetIdRef.current = null
    }
  }, [shouldUseCaptcha, turnstileReady, turnstileSiteKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (honeypot) {
      setSubmitted(true)
      return
    }

    if (shouldUseCaptcha && !captchaToken) {
      setError('Please complete the captcha check before posting.')
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memorialId: resolvedMemorialId,
        name,
        message,
        honeypot,
        submittedAt: startedAt,
        captchaToken: captchaToken || undefined,
      }),
    })

    if (!response.ok && response.status !== 202) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setError(payload?.message || 'Unable to submit your message right now.')
      if (shouldUseCaptcha && turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current)
      }
      setCaptchaToken(null)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div
        className="surface-card space-y-2 border-[color:var(--success)]/35 bg-[color:var(--success)]/10 p-6 text-center"
        aria-live="polite"
      >
        <h4 className="text-lg font-semibold text-[color:var(--success)]">Thank you for sharing</h4>
        <p className="text-sm text-[color:var(--stone-ink)]">Your message has been submitted and will appear after moderation.</p>
        <Button
          variant="outline"
          className="mt-2 border-[color:var(--success)]/30"
          onClick={() => {
            setSubmitted(false)
            setName('')
            setMessage('')
            setCaptchaToken(null)
            if (shouldUseCaptcha && turnstileWidgetIdRef.current && window.turnstile) {
              window.turnstile.reset(turnstileWidgetIdRef.current)
            }
          }}
        >
          Write another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 p-5 md:p-6">
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="guestbook-name" className="mb-1.5 block text-sm font-medium">
          Your Name
        </label>
        <Input
          id="guestbook-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Smith"
        />
      </div>
      <div>
        <label htmlFor="guestbook-message" className="mb-1.5 block text-sm font-medium">
          Your Message
        </label>
        <textarea
          id="guestbook-message"
          required
          rows={4}
          className="flex w-full rounded-md border border-input bg-[var(--surface-1)] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share a memory or words of comfort..."
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {shouldUseCaptcha && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            onLoad={() => setTurnstileReady(true)}
          />
          <div ref={turnstileContainerRef} data-testid="turnstile-widget" />
        </>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Post to Guestbook'}
      </Button>
    </form>
  )
}
