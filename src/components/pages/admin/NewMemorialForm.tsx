'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewMemorialForm() {
  const titleId = 'new-memorial-title'
  const slugId = 'new-memorial-slug'
  const fullNameId = 'new-memorial-full-name'
  const dedicationId = 'new-memorial-dedication'
  const dobId = 'new-memorial-dob'
  const dodId = 'new-memorial-dod'
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [fullName, setFullName] = useState('')
  const [dedicationText, setDedicationText] = useState('')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const response = await fetch('/api/admin/memorials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug,
        fullName,
        dedicationText,
        dob: dob || null,
        dod: dod || null,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setError(payload?.message || 'Unable to create memorial.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (!slug || slug === title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')) {
      setSlug(newTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="dashboard-hero surface-card space-y-2 p-6">
        <p className="section-kicker">New Memorial</p>
        <h2 className="text-3xl font-semibold tracking-[-0.03em]">Create New Memorial</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Start with the essential identity of the memorial. Photos, timeline events, guestbook moderation, and QR presentation can be refined after creation.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="surface-card space-y-5 p-6">
        <div className="grid gap-4">
          <div>
            <label htmlFor={titleId} className="mb-1.5 block text-sm font-medium">
              Memorial Title
            </label>
            <Input id={titleId} required value={title} onChange={handleTitleChange} placeholder="In Loving Memory of Jane Doe" />
          </div>

          <div>
            <label htmlFor={slugId} className="mb-1.5 block text-sm font-medium">
              URL Slug
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-secondary px-3 text-sm text-muted-foreground">/memorials/</span>
              <Input
                id={slugId}
                required
                className="rounded-l-none"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="jane-doe"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Use lowercase letters, numbers, and dashes for a stable public URL.</p>
          </div>

          <div>
            <label htmlFor={fullNameId} className="mb-1.5 block text-sm font-medium">
              Full Name
            </label>
            <Input id={fullNameId} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Elizabeth Doe" />
          </div>

          <div>
            <label htmlFor={dedicationId} className="mb-1.5 block text-sm font-medium">
              Dedication Text
            </label>
            <textarea
              id={dedicationId}
              value={dedicationText}
              onChange={(e) => setDedicationText(e.target.value)}
              maxLength={600}
              rows={4}
              className="flex min-h-[112px] w-full rounded-xl border border-input bg-[var(--surface-1)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="A short family dedication, prayer, or remembrance to welcome visitors."
            />
            <p className="mt-1 text-xs text-muted-foreground">Optional. This message appears near the top of the public memorial.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={dobId} className="mb-1.5 block text-sm font-medium">
                Date of Birth
              </label>
              <Input id={dobId} type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label htmlFor={dodId} className="mb-1.5 block text-sm font-medium">
                Date of Death
              </label>
              <Input id={dodId} type="date" value={dod} onChange={(e) => setDod(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Memorial'}
          </Button>
        </div>
      </form>
    </div>
  )
}
