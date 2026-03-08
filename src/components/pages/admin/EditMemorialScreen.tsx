'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { MediaUpload } from '@/components/admin/MediaUpload'
import { TimelineEditor } from '@/components/admin/TimelineEditor'
import { VideoManager } from '@/components/admin/VideoManager'
import { DataExport } from '@/components/admin/DataExport'
import { AdminMemorialInfo } from '@/components/admin/AdminMemorialInfo'
import { AdminPhotoGallery } from '@/components/admin/AdminPhotoGallery'
import { AdminQRCodeSection } from '@/components/admin/AdminQRCodeSection'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface MemorialRecord {
  id: string
  title: string
  slug: string
  full_name: string | null
  dedicationText: string | null
  dob: string | null
  dod: string | null
  accessMode: 'public' | 'private' | 'password'
  hero_image_url: string | null
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

interface PhotoRecord {
  id: string
  caption: string
  sort_index: number
  image_url: string | null
  thumb_url: string | null
  cloudinary_public_id: string | null
}

interface RedirectRecord {
  id: string
  shortcode: string
  print_status?: 'unverified' | 'verified'
  is_active?: boolean
}

interface EditMemorialScreenProps {
  memorialId: string
}

export function EditMemorialScreen({ memorialId }: EditMemorialScreenProps) {
  const [memorial, setMemorial] = useState<MemorialRecord | null>(null)
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [redirects, setRedirects] = useState<RedirectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchMemorial = useCallback(async () => {
    setErrorMessage(null)
    const memorialResponse = await fetch(`/api/admin/memorials/${memorialId}`, { cache: 'no-store' })
    if (!memorialResponse.ok) {
      const payload = (await memorialResponse.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load memorial.')
      setMemorial(null)
      setRedirects([])
      setPhotos([])
      setLoading(false)
      return
    }
    const memorialPayload = (await memorialResponse.json()) as { memorial?: MemorialRecord }
    setMemorial(memorialPayload.memorial ?? null)

    const [redirectsResponse, photosResponse] = await Promise.all([
      fetch(`/api/admin/memorials/${memorialId}/redirects`, { cache: 'no-store' }),
      fetch(`/api/admin/memorials/${memorialId}/photos`, { cache: 'no-store' }),
    ])

    if (redirectsResponse.ok) {
      const redirectsPayload = (await redirectsResponse.json()) as { redirects?: RedirectRecord[] }
      setRedirects(redirectsPayload.redirects ?? [])
    } else {
      setRedirects([])
    }

    if (photosResponse.ok) {
      const photosPayload = (await photosResponse.json()) as { photos?: PhotoRecord[] }
      setPhotos(photosPayload.photos ?? [])
    } else {
      setPhotos([])
    }

    setLoading(false)
  }, [memorialId])

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchMemorial()
    }, 0)

    return () => clearTimeout(kickoff)
  }, [fetchMemorial])

  const handleSetHero = async (photoUrl: string) => {
    setErrorMessage(null)
    const response = await fetch(`/api/admin/memorials/${memorialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroImageUrl: photoUrl }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update hero image.')
      return
    }

    setMemorial((current) => (current ? { ...current, hero_image_url: photoUrl } : current))
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading memorial editor...</div>
  if (!memorial) return <div className="surface-card p-8 text-sm">Memorial not found.</div>

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Edit Memorial: {memorial.title}</h2>
          <p className="text-sm text-muted-foreground">Manage memorial details, media, timeline, and sharing tools.</p>
        </div>
        {memorial.accessMode === 'public' && (
          <Button variant="outline" asChild>
            <Link href={`/memorials/${memorial.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              View Public Memorial
            </Link>
          </Button>
        )}
      </div>
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminMemorialInfo memorial={memorial} onUpdate={fetchMemorial} />

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Video Links (YouTube)</h3>
            <VideoManager memorialId={memorialId} />
          </section>

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Timeline Events</h3>
            <TimelineEditor memorialId={memorialId} />
          </section>

          <AdminQRCodeSection memorial={memorial} redirects={redirects} />

          <section className="surface-card space-y-4 p-6">
            <div className="space-y-1 border-b border-border pb-3">
              <h3 className="text-base font-semibold">Export and Archive</h3>
              <p className="text-sm text-muted-foreground">
                Download memorial records for handoff, review, or family archive requests.
              </p>
            </div>
            <DataExport memorialId={memorialId} memorialTitle={memorial.title} />
          </section>

          <section className="space-y-4">
            <h3 className="px-1 text-base font-semibold">Upload Photos</h3>
            <MediaUpload memorialId={memorialId} onUploadComplete={fetchMemorial} />
          </section>
        </div>

        <div className="space-y-6">
          <AdminPhotoGallery photos={photos} heroImageUrl={memorial.hero_image_url} onRefresh={fetchMemorial} onSetHero={handleSetHero} />
        </div>
      </div>
    </div>
  )
}
