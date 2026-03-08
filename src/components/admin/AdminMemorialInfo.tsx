'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, Lock, Shield } from 'lucide-react'

type AdminMemorial = {
  id: string
  title: string
  slug: string
  full_name: string | null
  dob: string | null
  dod: string | null
  accessMode: 'public' | 'private' | 'password'
  memorial_theme?: 'classic' | 'serene' | 'editorial'
  memorial_slideshow_enabled?: boolean
  memorial_slideshow_interval_ms?: number
  memorial_video_layout?: 'grid' | 'featured'
  memorial_photo_fit?: 'cover' | 'contain'
  memorial_caption_style?: 'classic' | 'minimal'
  qr_template?: 'classic' | 'minimal' | 'warm'
  qr_caption?: string
  qr_foreground_color?: '#111827' | '#14532d' | '#7c2d12'
  qr_background_color?: '#ffffff' | '#f8fafc' | '#fffaf2'
  qr_frame_style?: 'line' | 'rounded' | 'double'
  qr_caption_font?: 'serif' | 'sans'
  qr_show_logo?: boolean
}

interface AdminMemorialInfoProps {
  memorial: AdminMemorial
  onUpdate: () => void
}

export function AdminMemorialInfo({ memorial, onUpdate }: AdminMemorialInfoProps) {
  return <AdminMemorialInfoForm key={serializeMemorialKey(memorial)} memorial={memorial} onUpdate={onUpdate} />
}

function serializeMemorialKey(memorial: AdminMemorial) {
  return [
    memorial.id,
    memorial.title,
    memorial.slug,
    memorial.full_name ?? '',
    memorial.dob ?? '',
    memorial.dod ?? '',
    memorial.accessMode,
    memorial.memorial_theme ?? 'classic',
    String(memorial.memorial_slideshow_enabled ?? true),
    String(memorial.memorial_slideshow_interval_ms ?? 4500),
    memorial.memorial_video_layout ?? 'grid',
    memorial.memorial_photo_fit ?? 'cover',
    memorial.memorial_caption_style ?? 'classic',
    memorial.qr_template ?? 'classic',
    memorial.qr_caption ?? 'Scan me!',
    memorial.qr_foreground_color ?? '#111827',
    memorial.qr_background_color ?? '#ffffff',
    memorial.qr_frame_style ?? 'line',
    memorial.qr_caption_font ?? 'serif',
    String(memorial.qr_show_logo ?? false),
  ].join('|')
}

const accessModeDescriptions: Record<'public' | 'private' | 'password', { title: string; body: string }> = {
  public: {
    title: 'Visible by direct link and eligible for the homepage directory.',
    body: 'Use this when the memorial should be discoverable to visitors. Public memorials may appear on the landing-page directory when that setting is enabled.',
  },
  private: {
    title: 'Hidden from public visitors and excluded from the homepage directory.',
    body: 'Use this for memorials that should remain internal to the family or admin team. Visitors without admin access will not be able to open the memorial.',
  },
  password: {
    title: 'Protected by a family-managed password and excluded from the homepage directory.',
    body: 'Use this when visitors should access the memorial by direct link plus password. Protected memorials keep media behind signed access and require a current password to enter.',
  },
}

function AdminMemorialInfoForm({ memorial, onUpdate }: AdminMemorialInfoProps) {
  const accessModeId = 'page-access-mode'
  const passwordId = 'page-password'
  const titleId = 'page-title'
  const slugId = 'page-slug'
  const fullNameId = 'page-full-name'
  const dobId = 'page-dob'
  const dodId = 'page-dod'
  const [formData, setFormData] = useState({
    ...memorial,
    memorial_theme: memorial.memorial_theme || 'classic',
    memorial_slideshow_enabled: memorial.memorial_slideshow_enabled !== false,
    memorial_slideshow_interval_ms: memorial.memorial_slideshow_interval_ms || 4500,
    memorial_video_layout: memorial.memorial_video_layout || 'grid',
    memorial_photo_fit: memorial.memorial_photo_fit || 'cover',
    memorial_caption_style: memorial.memorial_caption_style || 'classic',
    qr_template: memorial.qr_template || 'classic',
    qr_caption: memorial.qr_caption || 'Scan me!',
    qr_foreground_color: memorial.qr_foreground_color || '#111827',
    qr_background_color: memorial.qr_background_color || '#ffffff',
    qr_frame_style: memorial.qr_frame_style || 'line',
    qr_caption_font: memorial.qr_caption_font || 'serif',
    qr_show_logo: memorial.qr_show_logo === true,
  })
  const [password, setPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setErrorMessage(null)

    const response = await fetch(`/api/admin/memorials/${memorial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        slug: formData.slug,
        fullName: formData.full_name,
        dob: formData.dob,
        dod: formData.dod,
        accessMode: formData.accessMode,
        password: password || undefined,
        memorialTheme: formData.memorial_theme,
        memorialSlideshowEnabled: formData.memorial_slideshow_enabled,
        memorialSlideshowIntervalMs: formData.memorial_slideshow_interval_ms,
        memorialVideoLayout: formData.memorial_video_layout,
        memorialPhotoFit: formData.memorial_photo_fit,
        memorialCaptionStyle: formData.memorial_caption_style,
        qrTemplate: formData.qr_template,
        qrCaption: formData.qr_caption,
        qrForegroundColor: formData.qr_foreground_color,
        qrBackgroundColor: formData.qr_background_color,
        qrFrameStyle: formData.qr_frame_style,
        qrCaptionFont: formData.qr_caption_font,
        qrShowLogo: formData.qr_show_logo,
      })
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to save memorial details.')
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
          {formData.accessMode === 'public' ? (
            <Globe className="h-4 w-4 text-primary" />
          ) : formData.accessMode === 'private' ? (
            <Lock className="h-4 w-4 text-amber-700" />
          ) : (
            <Shield className="h-4 w-4 text-violet-700" />
          )}
          <span className="capitalize">{formData.accessMode} Mode</span>
        </div>
        <label htmlFor={accessModeId} className="sr-only">
          Access mode
        </label>
        <select
          id={accessModeId}
          value={formData.accessMode}
          onChange={(e) =>
            setFormData({
              ...formData,
              accessMode: e.target.value as 'public' | 'private' | 'password',
            })
          }
          className="h-9 rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="password">Password</option>
        </select>
      </div>

      <div className="rounded-md border border-border/70 bg-secondary/25 px-3 py-2">
        <p className="text-sm font-medium text-foreground">{accessModeDescriptions[formData.accessMode].title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{accessModeDescriptions[formData.accessMode].body}</p>
      </div>

      {formData.accessMode === 'password' && (
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
          Memorial Title
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
            <label className="mb-1.5 block text-sm font-medium" htmlFor="photo-fit">
              Photo Fit
            </label>
            <select
              id="photo-fit"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.memorial_photo_fit}
              onChange={(e) => setFormData({ ...formData, memorial_photo_fit: e.target.value as 'cover' | 'contain' })}
            >
              <option value="cover">Cover (immersive)</option>
              <option value="contain">Contain (full image)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="caption-style">
              Caption Style
            </label>
            <select
              id="caption-style"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.memorial_caption_style}
              onChange={(e) => setFormData({ ...formData, memorial_caption_style: e.target.value as 'classic' | 'minimal' })}
            >
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
            </select>
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
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-foreground-color">
              QR Foreground Color
            </label>
            <select
              id="qr-foreground-color"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_foreground_color}
              onChange={(e) =>
                setFormData({ ...formData, qr_foreground_color: e.target.value as '#111827' | '#14532d' | '#7c2d12' })
              }
            >
              <option value="#111827">Slate</option>
              <option value="#14532d">Forest</option>
              <option value="#7c2d12">Copper</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-background-color">
              QR Background Color
            </label>
            <select
              id="qr-background-color"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_background_color}
              onChange={(e) =>
                setFormData({ ...formData, qr_background_color: e.target.value as '#ffffff' | '#f8fafc' | '#fffaf2' })
              }
            >
              <option value="#ffffff">Pure White</option>
              <option value="#f8fafc">Soft Slate</option>
              <option value="#fffaf2">Warm Paper</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-frame-style">
              QR Frame Style
            </label>
            <select
              id="qr-frame-style"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_frame_style}
              onChange={(e) => setFormData({ ...formData, qr_frame_style: e.target.value as 'line' | 'rounded' | 'double' })}
            >
              <option value="line">Line</option>
              <option value="rounded">Rounded</option>
              <option value="double">Double</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-caption-font">
              QR Caption Font
            </label>
            <select
              id="qr-caption-font"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_caption_font}
              onChange={(e) => setFormData({ ...formData, qr_caption_font: e.target.value as 'serif' | 'sans' })}
            >
              <option value="serif">Serif</option>
              <option value="sans">Sans</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="qr-show-logo">
              QR Monogram
            </label>
            <select
              id="qr-show-logo"
              className="h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-2 text-sm"
              value={formData.qr_show_logo ? 'enabled' : 'disabled'}
              onChange={(e) => setFormData({ ...formData, qr_show_logo: e.target.value === 'enabled' })}
            >
              <option value="disabled">Disabled</option>
              <option value="enabled">Enabled</option>
            </select>
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
