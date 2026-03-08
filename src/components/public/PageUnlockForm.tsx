'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PageUnlockFormProps {
  slug: string
}

export function PageUnlockForm({ slug }: PageUnlockFormProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    const response = await fetch(`/api/public/pages/${slug}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to unlock this memorial.')
      setLoading(false)
      return
    }

    window.location.reload()
  }

  return (
    <main id="main-content" className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <section className="surface-card w-full max-w-md space-y-5 p-6 md:p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Memorial Access Required</h1>
          <p className="text-sm text-muted-foreground">
            This memorial is password protected. Enter the family-provided password to continue. Protected memorials are shared by direct link
            and do not appear in the public directory.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label htmlFor="memorial-password" className="mb-1.5 block text-sm font-medium">
              Access Password
            </label>
            <Input
              id="memorial-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock Memorial'}
          </Button>
        </form>
      </section>
    </main>
  )
}
