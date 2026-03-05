'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Check, Loader2, Trash2, X } from 'lucide-react'

export default function GuestbookModeration() {
  type Entry = {
    id: string
    name: string
    message: string
    is_approved: boolean
    created_at: string
    pages?: { title?: string | null } | null
  }

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: 'approve' | 'unapprove' | 'delete' } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fetchEntries = useCallback(async () => {
    const response = await fetch('/api/admin/guestbook', { cache: 'no-store' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load guestbook entries.')
      setEntries([])
      setLoading(false)
      return
    }

    const payload = (await response.json()) as { entries?: Entry[] }
    setEntries(payload.entries ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries()
  }, [fetchEntries])

  const approveEntry = async (id: string) => {
    if (pendingAction) return
    const previous = entries
    setPendingAction({ id, kind: 'approve' })
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, is_approved: true } : entry)))

    setErrorMessage(null)
    const response = await fetch(`/api/admin/guestbook/${id}/approve`, { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to approve entry.')
      setEntries(previous)
      setPendingAction(null)
      return
    }
    setPendingAction(null)
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    if (pendingAction) return
    const previous = entries
    setPendingAction({ id, kind: 'delete' })
    setEntries((current) => current.filter((entry) => entry.id !== id))

    setErrorMessage(null)
    const response = await fetch(`/api/admin/guestbook/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to delete entry.')
      setEntries(previous)
      setPendingAction(null)
      return
    }
    setPendingAction(null)
  }

  const unapproveEntry = async (id: string) => {
    if (pendingAction) return
    const previous = entries
    setPendingAction({ id, kind: 'unapprove' })
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, is_approved: false } : entry)))

    setErrorMessage(null)
    const response = await fetch(`/api/admin/guestbook/${id}/unapprove`, { method: 'POST' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to unapprove entry.')
      setEntries(previous)
      setPendingAction(null)
      return
    }
    setPendingAction(null)
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading entries...</div>

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Guestbook Moderation</h2>
        <p className="text-sm text-muted-foreground">Approve or remove messages before they appear publicly.</p>
      </div>
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">From / Page</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="px-4 py-3">
                      {entry.is_approved ? (
                        <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">{entry.pages?.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-3 leading-relaxed text-foreground/95" title={entry.message}>
                        {entry.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(entry.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!entry.is_approved ? (
                          <Button variant="ghost" size="sm" onClick={() => approveEntry(entry.id)} disabled={pendingAction?.id === entry.id}>
                            {pendingAction?.id === entry.id && pendingAction.kind === 'approve' ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                            ) : (
                              <Check className="h-4 w-4 text-emerald-700" />
                            )}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => unapproveEntry(entry.id)} disabled={pendingAction?.id === entry.id}>
                            {pendingAction?.id === entry.id && pendingAction.kind === 'unapprove' ? (
                              <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                            ) : (
                              <X className="h-4 w-4 text-amber-700" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)} disabled={pendingAction?.id === entry.id}>
                          {pendingAction?.id === entry.id && pendingAction.kind === 'delete' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm italic text-muted-foreground">
                    No guestbook entries found.
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
