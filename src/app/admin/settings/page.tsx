'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2 } from 'lucide-react'

type RedirectItem = {
  id: string
  shortcode: string
  target_url: string
  created_at: string
}

export default function AdminSettings() {
  const [redirects, setRedirects] = useState<RedirectItem[]>([])
  const [shortcode, setShortcode] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fetchRedirects = useCallback(async () => {
    const response = await fetch('/api/admin/redirects', { cache: 'no-store' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load redirects.')
      setRedirects([])
      setLoading(false)
      return
    }

    const payload = (await response.json()) as { redirects?: RedirectItem[] }
    setRedirects(payload.redirects ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRedirects()
  }, [fetchRedirects])

  const createRedirect = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setCreating(true)

    const response = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortcode,
        targetUrl,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to create redirect.')
      setCreating(false)
      return
    }

    const payload = (await response.json()) as { redirect?: RedirectItem }
    setShortcode('')
    setTargetUrl('')
    if (payload.redirect) {
      setRedirects((current) => [payload.redirect!, ...current])
    } else {
      fetchRedirects()
    }
    setCreating(false)
  }

  const deleteRedirect = async (id: string) => {
    if (deletingId) return
    const previous = redirects
    setDeletingId(id)
    setRedirects((current) => current.filter((item) => item.id !== id))

    const response = await fetch(`/api/admin/redirects/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to delete redirect.')
      setRedirects(previous)
      setDeletingId(null)
      return
    }
    setErrorMessage(null)
    setDeletingId(null)
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading short links...</div>

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Short URL Management</h2>
        <p className="text-sm text-muted-foreground">Create and maintain redirect codes used in printed QR plaques.</p>
      </div>

      <form onSubmit={createRedirect} className="surface-card space-y-4 p-6">
        <h3 className="border-b border-border pb-2 text-base font-semibold">Create New Redirect</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Short Code</label>
            <Input required value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="grandma" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Target URL</label>
            <Input required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://.../memorials/sample" />
          </div>
        </div>
        {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
        <Button type="submit" className="w-full sm:w-auto" disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Redirect'
          )}
        </Button>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">Existing Redirects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Short Link</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redirects.length > 0 ? (
                redirects.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">/r/{r.shortcode}</td>
                    <td className="px-4 py-3 max-w-sm truncate text-muted-foreground">{r.target_url}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteRedirect(r.id)} disabled={deletingId === r.id}>
                        {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm italic text-muted-foreground">
                    No redirects created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
