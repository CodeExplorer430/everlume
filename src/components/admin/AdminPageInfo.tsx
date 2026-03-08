'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, Lock, Shield } from 'lucide-react'

type AdminPage = {
  id: string
  title: string
  slug: string
  full_name: string | null
  dob: string | null
  dod: string | null
  access_mode?: 'public' | 'private' | 'password'
  privacy: 'public' | 'private'
  memorial_theme?: 'classic' | 'serene' | 'editorial'
  memorial_slideshow_enabled?: boolean
  memorial_slideshow_interval_ms?: number
  memorial_video_layout?: 'grid' | 'featured'
  qr_template?: 'classic' | 'minimal' | 'warm'
  qr_caption?: string
}

interface AdminPageInfoProps {
  page: AdminPage
  onUpdate: () => void
}

export function AdminPageInfo({ page, onUpdate }: AdminPageInfoProps) {
  return <AdminPageInfoForm key={serializePageKey(page)} page={page} onUpdate={onUpdate} />
}

function serializePageKey(page: AdminPage) {
  return [
    page.id,
    page.title,
    page.slug,
    page.full_name ?? '',
    page.dob ?? '',
    page.dod ?? '',
    page.access_mode ?? '',
    page.privacy,
    page.memorial_theme ?? 'classic',
    String(page.memorial_slideshow_enabled ?? true),
    String(page.memorial_slideshow_interval_ms ?? 4500),
    page.memorial_video_layout ?? 'grid',
    page.qr_template ?? 'classic',
    page.qr_caption ?? 'Scan me!',
  ].join('|')
}

function AdminPageInfoForm({ page, onUpdate }: AdminPageInfoProps) {
  const accessModeId = 'page-access-mode'
  const passwordId = 'page-password'
  const titleId = 'page-title'
  const slugId = 'page-slug'
  const fullNameId = 'page-full-name'
  const dobId = 'page-dob'
  const dodId = 'page-dod'
  const [formData, setFormData] = useState({
    ...page,
    access_mode: page.access_mode || (page.privacy === 'private' ? 'private' : 'public'),
    memorial_theme: page.memorial_theme || 'classic',
    memorial_slideshow_enabled: page.memorial_slideshow_enabled !== false,
    memorial_slideshow_interval_ms: page.memorial_slideshow_interval_ms || 4500,
    memorial_video_layout: page.memorial_video_layout || 'grid',
    qr_template: page.qr_template || 'classic',
    qr_caption: page.qr_caption || 'Scan me!',
  })
  const [password, setPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setErrorMessage(null)

    const response = await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        slug: formData.slug,
        fullName: formData.full_name,
        dob: formData.dob,
        dod: formData.dod,
        accessMode: formData.access_mode,
        password: password || undefined,
        memorialTheme: formData.memorial_theme,
        memorialSlideshowEnabled: formData.memorial_slideshow_enabled,
        memorialSlideshowIntervalMs: formData.memorial_slideshow_interval_ms,
        memorialVideoLayout: formData.memorial_video_layout,
        qrTemplate: formData.qr_template,
        qrCaption: formData.qr_caption,
      })
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to save page details.')
      setUpdating(false)
      return
    }

    onUpdate()
    setPassword('')
    setUpdating(false)
  }

  return (
    <form onSubmit={handleUpdate} className="surface-card space-y-4 p-6">
      <h3 className="border-b border-border pb-2 text-base font-semibold">Basic Information</h3>

      <div className="flex items-center justify-between rounded-md border border-border bg-secondary/55 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {formData.access_mode === 'public' ? (
            <Globe className="h-4 w-4 text-primary" />
          ) : formData.access_mode === 'private' ? (
            <Lock className="h-4 w-4 text-amber-700" />
          ) : (
            <Shield className="h-4 w-4 text-violet-700" />
          )}
          <span className="capitalize">{formData.access_mode} Mode</span>
        </div>
        <label htmlFor={accessModeId} className="sr-only">
          Access mode
        </label>
        <select
          id={accessModeId}
          value={formData.access_mode}
          onChange={(e) =>
            setFormData({
              ...formData,
              access_mode: e.target.value as 'public' | 'private' | 'password',
              privacy: e.target.value === 'public' ? 'public' : 'private',
            })
          }
          className="h-9 rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="password">Password</option>
        </select>
      </div>

      {formData.access_mode === 'password' && (
        <div>
          <label htmlFor={passwordId} className="mb-1.5 block text-sm font-medium">
            Set or Rotate Password
          </label>
          <Input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="Enter a new access password"
          />
          <p className="mt-1 text-xs text-muted-foreground">Password must be at least 6 characters. Leave blank to keep current password.</p>
        </div>
      )}

      <div>
        <label htmlFor={titleId} className="mb-1.5 block text-sm font-medium">
          Page Title
        </label>
        <Input id={titleId} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      </div>
      <div>
        <label htmlFor={slugId} className="mb-1.5 block text-sm font-medium">
          Slug
        </label>
        <Input id={slugId} value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
      </div>
      <div>
        <label htmlFor={fullNameId} className="mb-1.5 block text-sm font-medium">
          Full Name
        </label>
        <Input id={fullNameId} value={formData.full_name || ''} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={dobId} className="mb-1.5 block text-sm font-medium">
            DOB
          </label>
          <Input id={dobId} type="date" value={formData.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
        </div>
        <div>
          <label htmlFor={dodId} className="mb-1.5 block text-sm font-medium">
            DOD
          </label>
          <Input id={dodId} type="date" value={formData.dod || ''} onChange={(e) => setFormData({ ...formData, dod: e.target.value })} />
        </div>
      </div>

      <section className="space-y-4 rounded-md border border-border bg-secondary/30 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Memorial Experience</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="memorial-theme">
              Theme Preset
            </label>
            <select
              id="memorial-theme"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.memorial_theme}
              onChange={(e) => setFormData({ ...formData, memorial_theme: e.target.value as 'classic' | 'serene' | 'editorial' })}
            >
              <option value="classic">Classic</option>
              <option value="serene">Serene</option>
              <option value="editorial">Editorial</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="video-layout">
              Video Layout
            </label>
            <select
              id="video-layout"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.memorial_video_layout}
              onChange={(e) => setFormData({ ...formData, memorial_video_layout: e.target.value as 'grid' | 'featured' })}
            >
              <option value="grid">Grid</option>
              <option value="featured">Featured + List</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="slideshow-enabled">
              Slideshow
            </label>
            <select
              id="slideshow-enabled"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.memorial_slideshow_enabled ? 'enabled' : 'disabled'}
              onChange={(e) => setFormData({ ...formData, memorial_slideshow_enabled: e.target.value === 'enabled' })}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="slideshow-interval">
              Slideshow Interval (ms)
            </label>
            <Input
              id="slideshow-interval"
              type="number"
              min={2000}
              max={12000}
              step={500}
              value={formData.memorial_slideshow_interval_ms || 4500}
              onChange={(e) => setFormData({ ...formData, memorial_slideshow_interval_ms: Number(e.target.value) || 4500 })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-template">
              QR Template
            </label>
            <select
              id="qr-template"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_template}
              onChange={(e) => setFormData({ ...formData, qr_template: e.target.value as 'classic' | 'minimal' | 'warm' })}
            >
              <option value="classic">Classic Plaque</option>
              <option value="minimal">Minimal</option>
              <option value="warm">Warm Memorial</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-caption">
              QR Caption
            </label>
            <Input
              id="qr-caption"
              maxLength={40}
              value={formData.qr_caption || 'Scan me!'}
              onChange={(e) => setFormData({ ...formData, qr_caption: e.target.value })}
            />
          </div>
        </div>
      </section>
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
      <Button type="submit" className="w-full" disabled={updating}>
        {updating ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
