'use client'

import { useEffect, useState } from 'react'

type ConsentLogEntry = {
  id: string
  event_type: 'consent_granted' | 'media_accessed'
  access_mode: 'public' | 'private' | 'password'
  consent_source: string
  consent_version?: number
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
  const [noticeVersion, setNoticeVersion] = useState(1)
  const [revokedAt, setRevokedAt] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void (async () => {
      const response = await fetch(
        `/api/admin/memorials/${memorialId}/media-consent`,
        { cache: 'no-store' }
      )
      if (!active) return

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        setErrorMessage(
          payload?.message || 'Unable to load media consent records.'
        )
        setEntries([])
        setLoading(false)
        return
      }

      const payload = (await response.json()) as {
        logs?: ConsentLogEntry[]
        memorial?: { mediaConsentRevokedAt?: string | null }
        consentNoticeVersion?: number
      }
      setEntries(payload.logs ?? [])
      setNoticeVersion(Number(payload.consentNoticeVersion) || 1)
      setRevokedAt(payload.memorial?.mediaConsentRevokedAt || null)
      setErrorMessage(null)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [memorialId])

  if (loading) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Loading protected media consent records...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="surface-card p-6 text-sm text-destructive">
        {errorMessage}
      </div>
    )
  }

  const revokeConsent = async () => {
    setRevoking(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const response = await fetch(
      `/api/admin/memorials/${memorialId}/media-consent`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      setErrorMessage(
        payload?.message || 'Unable to revoke protected media consent.'
      )
      setRevoking(false)
      return
    }

    const payload = (await response.json()) as { revokedAt?: string | null }
    setRevokedAt(payload.revokedAt || new Date().toISOString())
    setSuccessMessage(
      'Existing protected-media consent cookies were revoked for this memorial.'
    )
    setRevoking(false)
  }

  return (
    <section className="surface-card space-y-4 p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Protected Media Consent</h3>
          <p className="text-sm text-muted-foreground">
            Recent consent and protected-media access events for this memorial.
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Active notice version {noticeVersion}
          </p>
          {revokedAt ? (
            <p className="text-xs text-muted-foreground">
              Last revoked: {new Date(revokedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={revokeConsent}
          disabled={revoking}
        >
          {revoking ? 'Revoking...' : 'Revoke Existing Consent'}
        </button>
      </div>

      {successMessage ? (
        <p className="text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No protected media consent events have been recorded yet.
        </p>
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
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {entry.event_type === 'consent_granted'
                      ? 'Consent granted'
                      : 'Media accessed'}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {entry.media_kind
                      ? `${entry.media_kind}${entry.media_variant ? ` (${entry.media_variant})` : ''}`
                      : 'Memorial media'}
                  </td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">
                    {entry.access_mode}
                    {entry.consent_version ? (
                      <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        v{entry.consent_version}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    IP {shortenHash(entry.ip_hash)}
                    <br />
                    UA {shortenHash(entry.user_agent_hash)}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
