'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewMemorialForm() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const response = await fetch('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug,
        fullName,
        dob: dob || null,
        dod: dod || null,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setError(payload?.message || 'Unable to create memorial page.')
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
      <section className="surface-card space-y-1 p-6">
        <h2 className="text-3xl font-semibold tracking-tight">Create New Memorial</h2>
        <p className="text-sm text-muted-foreground">Start with core information now. You can enrich photos, timeline, and videos next.</p>
      </section>

      <form onSubmit={handleSubmit} className="surface-card space-y-5 p-6">
        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Page Title</label>
            <Input required value={title} onChange={handleTitleChange} placeholder="In Loving Memory of Jane Doe" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">URL Slug</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-secondary px-3 text-sm text-muted-foreground">/memorials/</span>
              <Input required className="rounded-l-none" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="jane-doe" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Full Name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Elizabeth Doe" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date of Birth</label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date of Death</label>
              <Input type="date" value={dod} onChange={(e) => setDod(e.target.value)} />
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
