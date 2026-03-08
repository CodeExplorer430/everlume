'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GuestbookFormProps {
  memorialId: string
}

type TurnstileWidgetId = string | number
type GuestbookResponseCode =
  | 'CONFIGURATION_ERROR'
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'TOO_FAST'
  | 'CAPTCHA_FAILED'
  | 'RATE_LIMITED'
  | 'MEMORIAL_NOT_FOUND'
  | 'DATABASE_ERROR'

function mapGuestbookError(code?: GuestbookResponseCode, message?: string) {
  switch (code) {
    case 'CAPTCHA_FAILED':
      return 'Please complete the spam-protection check before posting.'
    case 'RATE_LIMITED':
      return 'Too many messages were sent recently. Please wait a minute and try again.'
    case 'TOO_FAST':
      return 'Please take a moment before sending your message.'
    case 'CONFIGURATION_ERROR':
      return 'The guestbook is temporarily unavailable while protection settings are being finalized.'
    case 'MEMORIAL_NOT_FOUND':
      return 'This memorial is no longer available for new guestbook messages.'
    case 'DATABASE_ERROR':
      return 'The guestbook is temporarily unavailable. Please try again shortly.'
    case 'VALIDATION_ERROR':
      return 'Please review your name and message, then try again.'
    default:
      return message || 'Unable to submit your message right now.'
  }
}

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

export function GuestbookForm({ memorialId }: GuestbookFormProps) {
  const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()
  const shouldUseCaptcha = turnstileSiteKey.length > 0
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<TurnstileWidgetId | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileLoadFailed, setTurnstileLoadFailed] = useState(false)
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
      callback: (token) => {
        setCaptchaToken(token)
        setError(null)
      },
      'expired-callback': () => {
        setCaptchaToken(null)
        setError('The spam-protection check expired. Please complete it again before posting.')
      },
      'error-callback': () => {
        setCaptchaToken(null)
        setTurnstileLoadFailed(true)
        setError('Spam protection failed to load. Refresh the page and try again.')
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

    if (shouldUseCaptcha && turnstileLoadFailed) {
      setError('Spam protection failed to load. Refresh the page and try again.')
      return
    }

    if (shouldUseCaptcha && !turnstileReady) {
      setError('Spam protection is still loading. Please wait a moment and try again.')
      return
    }

    if (shouldUseCaptcha && !captchaToken) {
      setError('Please complete the spam-protection check before posting.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memorialId,
          name,
          message,
          honeypot,
          submittedAt: startedAt,
          captchaToken: captchaToken || undefined,
        }),
      })

      if (!response.ok && response.status !== 202) {
        const payload = (await response.json().catch(() => null)) as { message?: string; code?: GuestbookResponseCode } | null
        setError(mapGuestbookError(payload?.code, payload?.message))
        if (shouldUseCaptcha && turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetIdRef.current)
        }
        setCaptchaToken(null)
        return
      }

      setSubmitted(true)
    } catch {
      setError('The guestbook could not be reached. Please check your connection and try again.')
      if (shouldUseCaptcha && turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current)
      }
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
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
      <div className="rounded-2xl border border-border/70 bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
        Messages are reviewed by the family before they appear publicly.
        {shouldUseCaptcha ? ' Spam protection is enabled before your note is sent.' : ' Your note will be held for moderation after submission.'}
      </div>

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
            onLoad={() => {
              setTurnstileReady(true)
              setTurnstileLoadFailed(false)
            }}
            onError={() => {
              setTurnstileLoadFailed(true)
              setError('Spam protection failed to load. Refresh the page and try again.')
            }}
          />
          <p className="text-xs text-muted-foreground">
            Complete the spam-protection check so the family guestbook stays safe from automated posts.
          </p>
          <div ref={turnstileContainerRef} data-testid="turnstile-widget" />
        </>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Post to Guestbook'}
      </Button>
    </form>
  )
}
