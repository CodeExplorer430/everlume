'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2, PauseCircle, PlayCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'

type RedirectItem = {
  id: string
  shortcode: string
  target_url: string
  print_status: 'unverified' | 'verified'
  last_verified_at: string | null
  is_active: boolean
  created_at: string
}

type SiteSettings = {
  homeDirectoryEnabled: boolean
  memorialSlideshowEnabled: boolean
  memorialSlideshowIntervalMs: number
  memorialVideoLayout: 'grid' | 'featured'
  protectedMediaConsentTitle: string
  protectedMediaConsentBody: string
  protectedMediaConsentVersion: number
}

export function AdminSettingsScreen() {
  const [redirects, setRedirects] = useState<RedirectItem[]>([])
  const [shortcode, setShortcode] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [homeDirectoryEnabled, setHomeDirectoryEnabled] = useState(false)
  const [memorialSlideshowEnabled, setMemorialSlideshowEnabled] = useState(true)
  const [memorialSlideshowIntervalMs, setMemorialSlideshowIntervalMs] = useState(4500)
  const [memorialVideoLayout, setMemorialVideoLayout] = useState<'grid' | 'featured'>('grid')
  const [protectedMediaConsentTitle, setProtectedMediaConsentTitle] = useState('Media Viewing Notice')
  const [protectedMediaConsentBody, setProtectedMediaConsentBody] = useState(
    "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight."
  )
  const [protectedMediaConsentVersion, setProtectedMediaConsentVersion] = useState(1)
  const [updatingSiteSettings, setUpdatingSiteSettings] = useState(false)

  const fetchRedirects = useCallback(async () => {
    setLoading(true)
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
    setErrorMessage(null)
    setLoading(false)
  }, [])

  const fetchSiteSettings = useCallback(async () => {
    const response = await fetch('/api/admin/site-settings', { cache: 'no-store' })
    if (!response.ok) return
    const payload = (await response.json()) as { settings?: Partial<SiteSettings> }
    setHomeDirectoryEnabled(payload.settings?.homeDirectoryEnabled === true)
    setMemorialSlideshowEnabled(payload.settings?.memorialSlideshowEnabled !== false)
    setMemorialSlideshowIntervalMs(payload.settings?.memorialSlideshowIntervalMs || 4500)
    setMemorialVideoLayout(payload.settings?.memorialVideoLayout === 'featured' ? 'featured' : 'grid')
    setProtectedMediaConsentTitle(payload.settings?.protectedMediaConsentTitle || 'Media Viewing Notice')
    setProtectedMediaConsentBody(
      payload.settings?.protectedMediaConsentBody ||
        "The family has protected this memorial's photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight."
    )
    setProtectedMediaConsentVersion(Number(payload.settings?.protectedMediaConsentVersion) || 1)
  }, [])

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchRedirects()
      void fetchSiteSettings()
    }, 0)

    return () => clearTimeout(kickoff)
  }, [fetchRedirects, fetchSiteSettings])

  const createRedirect = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setCreating(true)

    const response = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortcode: shortcode.trim().toLowerCase(),
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
      await fetchRedirects()
    }
    setCreating(false)
  }

  const updateSiteSettings = async (updates: Partial<SiteSettings> & { bumpProtectedMediaConsentVersion?: boolean }, rollback: () => void) => {
    if (updatingSiteSettings) return
    setUpdatingSiteSettings(true)

    const response = await fetch('/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      rollback()
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update site settings.')
      setUpdatingSiteSettings(false)
      return false
    }

    setUpdatingSiteSettings(false)
    return true
  }

  const toggleHomeDirectory = async () => {
    if (updatingSiteSettings) return
    const nextValue = !homeDirectoryEnabled
    setHomeDirectoryEnabled(nextValue)
    await updateSiteSettings({ homeDirectoryEnabled: nextValue }, () => setHomeDirectoryEnabled(!nextValue))
  }

  const toggleMemorialSlideshow = async () => {
    if (updatingSiteSettings) return
    const nextValue = !memorialSlideshowEnabled
    setMemorialSlideshowEnabled(nextValue)
    await updateSiteSettings(
      { memorialSlideshowEnabled: nextValue },
      () => setMemorialSlideshowEnabled(!nextValue)
    )
  }

  const saveMemorialPresentation = async () => {
    if (updatingSiteSettings) return
    const clampedInterval = Math.min(12000, Math.max(2000, memorialSlideshowIntervalMs || 4500))
    const previous = {
      memorialSlideshowIntervalMs,
      memorialVideoLayout,
    }
    setMemorialSlideshowIntervalMs(clampedInterval)
    await updateSiteSettings(
      {
        memorialSlideshowIntervalMs: clampedInterval,
        memorialVideoLayout,
      },
      () => {
        setMemorialSlideshowIntervalMs(previous.memorialSlideshowIntervalMs)
        setMemorialVideoLayout(previous.memorialVideoLayout)
      }
    )
  }

  const saveProtectedMediaConsent = async (republishOnly = false) => {
    if (updatingSiteSettings) return
    const previous = {
      protectedMediaConsentTitle,
      protectedMediaConsentBody,
      protectedMediaConsentVersion,
    }

    if (republishOnly) {
      setProtectedMediaConsentVersion((current) => current + 1)
    }

    const ok = await updateSiteSettings(
      {
        ...(republishOnly
          ? { bumpProtectedMediaConsentVersion: true }
          : {
              protectedMediaConsentTitle: protectedMediaConsentTitle.trim(),
              protectedMediaConsentBody: protectedMediaConsentBody.trim(),
            }),
      },
      () => {
        setProtectedMediaConsentTitle(previous.protectedMediaConsentTitle)
        setProtectedMediaConsentBody(previous.protectedMediaConsentBody)
        setProtectedMediaConsentVersion(previous.protectedMediaConsentVersion)
      }
    )

    if (ok) {
      setProtectedMediaConsentVersion((current) => current + 1)
    }
  }

  const updateRedirect = async (
    id: string,
    updates: { printStatus?: RedirectItem['print_status']; isActive?: boolean }
  ) => {
    if (updatingId) return
    setUpdatingId(id)
    setErrorMessage(null)

    const previous = redirects
    setRedirects((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          print_status: updates.printStatus ?? item.print_status,
          last_verified_at:
            updates.printStatus === 'verified'
              ? new Date().toISOString()
              : updates.printStatus === 'unverified'
                ? null
                : item.last_verified_at,
          is_active: updates.isActive ?? item.is_active,
        }
      })
    )

    const response = await fetch(`/api/admin/redirects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update redirect.')
      setRedirects(previous)
      setUpdatingId(null)
      return
    }

    const payload = (await response.json()) as { redirect?: RedirectItem }
    if (payload.redirect) {
      setRedirects((current) => current.map((item) => (item.id === id ? payload.redirect! : item)))
    }
    setUpdatingId(null)
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
      <section className="dashboard-hero surface-card space-y-2 p-6">
        <p className="section-kicker">Links and Launch Controls</p>
        <h2 className="text-3xl font-semibold tracking-[-0.03em]">Short URL Management</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Create and maintain redirect codes used in printed QR plaques.</p>
        <p className="text-xs text-muted-foreground">
          Codes must be 3-32 characters and use only lowercase letters, numbers, and dashes.
        </p>
      </section>

      <section className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Homepage Directory</h3>
          <p className="text-sm text-muted-foreground">
            Show a public list of memorials on the landing page. Only memorials set to public appear here. Private and password-protected
            pages stay hidden.
          </p>
        </div>
        <Button variant={homeDirectoryEnabled ? 'secondary' : 'outline'} onClick={toggleHomeDirectory} disabled={updatingSiteSettings}>
          {updatingSiteSettings ? 'Saving...' : homeDirectoryEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Memorial Presentation Defaults</h3>
          <p className="text-sm text-muted-foreground">Used when creating new memorials. Per-memorial settings can override these defaults.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Photo Slideshow</p>
            <Button variant={memorialSlideshowEnabled ? 'secondary' : 'outline'} onClick={toggleMemorialSlideshow} disabled={updatingSiteSettings}>
              {updatingSiteSettings ? 'Saving...' : memorialSlideshowEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <div>
            <label htmlFor="slideshow-interval" className="mb-1.5 block text-sm font-medium">
              Slideshow Interval (milliseconds)
            </label>
            <Input
              id="slideshow-interval"
              type="number"
              min={2000}
              max={12000}
              step={500}
              value={memorialSlideshowIntervalMs}
              onChange={(e) => setMemorialSlideshowIntervalMs(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="video-layout" className="mb-1.5 block text-sm font-medium">
              Video Layout
            </label>
            <select
              id="video-layout"
              className="form-select w-full"
              value={memorialVideoLayout}
              onChange={(e) => setMemorialVideoLayout(e.target.value === 'featured' ? 'featured' : 'grid')}
            >
              <option value="grid">Grid</option>
              <option value="featured">Featured + List</option>
            </select>
          </div>
        </div>
        <div>
          <Button variant="outline" onClick={saveMemorialPresentation} disabled={updatingSiteSettings}>
            {updatingSiteSettings ? 'Saving...' : 'Save Memorial Presentation'}
          </Button>
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Protected Media Consent Notice</h3>
          <p className="text-sm text-muted-foreground">
            Visitors must accept this notice before protected memorial media is shown. Saving new copy republishes the notice and invalidates
            existing protected-media consent cookies.
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current version {protectedMediaConsentVersion}</p>
        </div>
        <div className="grid gap-4">
          <div>
            <label htmlFor="protected-media-consent-title" className="mb-1.5 block text-sm font-medium">
              Notice Title
            </label>
            <Input
              id="protected-media-consent-title"
              value={protectedMediaConsentTitle}
              onChange={(e) => setProtectedMediaConsentTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="protected-media-consent-body" className="mb-1.5 block text-sm font-medium">
              Notice Body
            </label>
            <textarea
              id="protected-media-consent-body"
              className="form-textarea min-h-32 w-full"
              value={protectedMediaConsentBody}
              onChange={(e) => setProtectedMediaConsentBody(e.target.value)}
              maxLength={800}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => void saveProtectedMediaConsent(false)}
            disabled={updatingSiteSettings || protectedMediaConsentTitle.trim().length < 8 || protectedMediaConsentBody.trim().length < 20}
          >
            {updatingSiteSettings ? 'Saving...' : 'Save and Publish New Version'}
          </Button>
          <Button variant="ghost" onClick={() => void saveProtectedMediaConsent(true)} disabled={updatingSiteSettings}>
            {updatingSiteSettings ? 'Saving...' : 'Republish Current Notice'}
          </Button>
        </div>
      </section>

      <form onSubmit={createRedirect} className="surface-card space-y-4 p-6">
        <h3 className="border-b border-border pb-2 text-base font-semibold">Create New Redirect</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Short Code</label>
            <Input required value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="grandma" pattern="^[a-z0-9-]{3,32}$" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Target URL</label>
            <Input required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://yourdomain.com/memorials/sample" />
          </div>
        </div>
        {errorMessage && (
          <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <p>{errorMessage}</p>
            <Button variant="outline" size="sm" type="button" onClick={fetchRedirects}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}
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
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Print</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redirects.length > 0 ? (
                redirects.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">/{r.shortcode}</td>
                    <td className="max-w-sm px-4 py-3 truncate text-muted-foreground">{r.target_url}</td>
                    <td className="px-4 py-3">
                      <span className={r.is_active ? 'text-emerald-700' : 'text-amber-700'}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className={r.print_status === 'verified' ? 'text-emerald-700' : 'text-muted-foreground'}>
                        {r.print_status === 'verified' ? 'Verified' : 'Unverified'}
                      </span>
                      <div>{r.last_verified_at ? `Last: ${new Date(r.last_verified_at).toLocaleDateString()}` : 'Not yet verified'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRedirect(r.id, { isActive: !r.is_active })}
                          disabled={updatingId === r.id}
                          aria-label={r.is_active ? `Disable redirect ${r.shortcode}` : `Enable redirect ${r.shortcode}`}
                        >
                          {updatingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : r.is_active ? (
                            <PauseCircle className="h-4 w-4 text-amber-700" />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-emerald-700" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRedirect(r.id, { printStatus: r.print_status === 'verified' ? 'unverified' : 'verified' })}
                          disabled={updatingId === r.id}
                          aria-label={
                            r.print_status === 'verified'
                              ? `Mark redirect ${r.shortcode} as unverified`
                              : `Mark redirect ${r.shortcode} as verified`
                          }
                        >
                          {updatingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : r.print_status === 'verified' ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRedirect(r.id)}
                          disabled={deletingId === r.id}
                          aria-label={`Delete redirect ${r.shortcode}`}
                        >
                          {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm italic text-muted-foreground">
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
