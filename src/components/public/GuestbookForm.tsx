'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GuestbookFormProps {
  pageId: string
}

export function GuestbookForm({ pageId }: GuestbookFormProps) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (honeypot) {
      setSubmitted(true)
      return
    }

    setLoading(true)
    setError(null)

    const { error: insertError } = await supabase.from('guestbook').insert({
      page_id: pageId,
      name,
      message,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="surface-card space-y-2 border-[color:var(--success)]/35 bg-[color:var(--success)]/10 p-6 text-center">
        <h4 className="text-lg font-semibold text-[color:var(--success)]">Thank you for sharing</h4>
        <p className="text-sm text-[color:var(--stone-ink)]">Your message has been submitted and will appear after moderation.</p>
        <Button
          variant="outline"
          className="mt-2 border-[color:var(--success)]/30"
          onClick={() => {
            setSubmitted(false)
            setName('')
            setMessage('')
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

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Post to Guestbook'}
      </Button>
    </form>
  )
}
