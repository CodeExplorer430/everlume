'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ConsentReportRow = {
  id: string
  memorialId: string
  memorialTitle: string
  memorialSlug: string
  eventType: 'consent_granted' | 'media_accessed'
  accessMode: 'public' | 'private' | 'password'
  consentSource: string
  consentVersion: number
  mediaKind: string | null
  mediaVariant: string | null
  ipHash: string
  userAgentHash: string
  createdAt: string
}

function shortenHash(value: string) {
  return value.slice(0, 12)
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function MediaConsentReportScreen() {
  const [logs, setLogs] = useState<ConsentReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<
    'all' | 'consent_granted' | 'media_accessed'
  >('all')

  useEffect(() => {
    let active = true

    void (async () => {
      const response = await fetch('/api/admin/media-consent', {
        cache: 'no-store',
      })
      if (!active) return

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        setErrorMessage(
          payload?.message || 'Unable to load protected media consent report.'
        )
        setLogs([])
        setLoading(false)
        return
      }

      const payload = (await response.json()) as { logs?: ConsentReportRow[] }
      setLogs(payload.logs ?? [])
      setErrorMessage(null)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return logs.filter((entry) => {
      if (eventFilter !== 'all' && entry.eventType !== eventFilter) return false
      if (!normalizedSearch) return true

      return (
        entry.memorialTitle.toLowerCase().includes(normalizedSearch) ||
        entry.memorialSlug.toLowerCase().includes(normalizedSearch) ||
        entry.accessMode.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [eventFilter, logs, search])

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      consentGranted: filteredLogs.filter(
        (entry) => entry.eventType === 'consent_granted'
      ).length,
      mediaAccessed: filteredLogs.filter(
        (entry) => entry.eventType === 'media_accessed'
      ).length,
      memorials: new Set(filteredLogs.map((entry) => entry.memorialId)).size,
    }),
    [filteredLogs]
  )

  const exportCsv = () => {
    const header = [
      'memorial_title',
      'memorial_slug',
      'event_type',
      'access_mode',
      'consent_version',
      'media_kind',
      'media_variant',
      'ip_hash',
      'user_agent_hash',
      'created_at',
    ]
    const rows = filteredLogs.map((entry) =>
      [
        entry.memorialTitle,
        entry.memorialSlug,
        entry.eventType,
        entry.accessMode,
        String(entry.consentVersion),
        entry.mediaKind || '',
        entry.mediaVariant || '',
        entry.ipHash,
        entry.userAgentHash,
        entry.createdAt,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    )

    downloadCsv(
      'everlume_media_consent_report.csv',
      [header.join(','), ...rows].join('\n')
    )
  }

  if (loading)
    return (
      <div className="surface-card p-8 text-sm text-muted-foreground">
        Loading consent report...
      </div>
    )

  return (
    <div className="space-y-6">
      <section className="dashboard-hero surface-card space-y-2 p-6">
        <p className="section-kicker">Protected Media Oversight</p>
        <h2 className="text-3xl font-semibold tracking-[-0.03em]">
          Consent and Access Report
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Review protected-media consent events across memorials, confirm
          current notice adoption, and export a flat report for family records.
        </p>
        <div className="status-pill w-fit">Audit-ready export</div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="surface-card data-card p-4">
          <p className="section-kicker">Events</p>
          <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
        </div>
        <div className="surface-card data-card p-4">
          <p className="section-kicker">Consent Granted</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary.consentGranted}
          </p>
        </div>
        <div className="surface-card data-card p-4">
          <p className="section-kicker">Media Accessed</p>
          <p className="mt-2 text-3xl font-semibold">{summary.mediaAccessed}</p>
        </div>
        <div className="surface-card data-card p-4">
          <p className="section-kicker">Memorials</p>
          <p className="mt-2 text-3xl font-semibold">{summary.memorials}</p>
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div>
            <label
              htmlFor="consent-search"
              className="mb-1.5 block text-sm font-medium"
            >
              Search memorials
            </label>
            <Input
              id="consent-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug, or access mode"
            />
          </div>
          <div>
            <label
              htmlFor="consent-event-filter"
              className="mb-1.5 block text-sm font-medium"
            >
              Event type
            </label>
            <select
              id="consent-event-filter"
              className="form-select w-full"
              value={eventFilter}
              onChange={(e) =>
                setEventFilter(
                  e.target.value as 'all' | 'consent_granted' | 'media_accessed'
                )
              }
            >
              <option value="all">All events</option>
              <option value="consent_granted">Consent granted</option>
              <option value="media_accessed">Media accessed</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
          >
            Export CSV
          </Button>
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {filteredLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No protected-media consent events match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Memorial</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Access</th>
                  <th className="pb-2 pr-4 font-medium">Visitor</th>
                  <th className="pb-2 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredLogs.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">
                        {entry.memorialTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{entry.memorialSlug}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {entry.eventType === 'consent_granted'
                        ? 'Consent granted'
                        : 'Media accessed'}
                      <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        v{entry.consentVersion}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <span className="capitalize">{entry.accessMode}</span>
                      <span className="block text-xs">
                        {entry.mediaKind
                          ? `${entry.mediaKind}${entry.mediaVariant ? ` (${entry.mediaVariant})` : ''}`
                          : 'Memorial media'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      IP {shortenHash(entry.ipHash)}
                      <br />
                      UA {shortenHash(entry.userAgentHash)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
