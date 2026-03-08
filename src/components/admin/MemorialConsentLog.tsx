'use client'

import { useEffect, useState } from 'react'

type ConsentLogEntry = {
  id: string
  event_type: 'consent_granted' | 'media_accessed'
  access_mode: 'public' | 'private' | 'password'
  consent_source: string
  media_kind: string | null
  media_variant: string | null
  ip_hash: string
  user_agent_hash: string
  created_at: string
}

interface MemorialConsentLogProps {
  memorialId: string
}

function shortenHash(value: string) {
  return value.slice(0, 12)
}

export function MemorialConsentLog({ memorialId }: MemorialConsentLogProps) {
  const [entries, setEntries] = useState<ConsentLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void (async () => {
      const response = await fetch(`/api/admin/memorials/${memorialId}/media-consent`, { cache: 'no-store' })
      if (!active) return

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        setErrorMessage(payload?.message || 'Unable to load media consent records.')
        setEntries([])
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { logs?: ConsentLogEntry[] }
      setEntries(payload.logs ?? [])
      setErrorMessage(null)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [memorialId])

  if (loading) {
    return <div className="surface-card p-6 text-sm text-muted-foreground">Loading protected media consent records...</div>
  }

  if (errorMessage) {
    return <div className="surface-card p-6 text-sm text-destructive">{errorMessage}</div>
  }

  return (
    <section className="surface-card space-y-4 p-6">
      <div className="space-y-1 border-b border-border pb-3">
        <h3 className="text-base font-semibold">Protected Media Consent</h3>
        <p className="text-sm text-muted-foreground">Recent consent and protected-media access events for this memorial.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No protected media consent events have been recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="pb-2 pr-4 font-medium">Event</th>
                <th className="pb-2 pr-4 font-medium">Media</th>
                <th className="pb-2 pr-4 font-medium">Access</th>
                <th className="pb-2 pr-4 font-medium">Visitor</th>
                <th className="pb-2 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">{entry.event_type === 'consent_granted' ? 'Consent granted' : 'Media accessed'}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{entry.media_kind ? `${entry.media_kind}${entry.media_variant ? ` (${entry.media_variant})` : ''}` : 'Memorial media'}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{entry.access_mode}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    IP {shortenHash(entry.ip_hash)}
                    <br />
                    UA {shortenHash(entry.user_agent_hash)}
                  </td>
                  <td className="py-3 text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
