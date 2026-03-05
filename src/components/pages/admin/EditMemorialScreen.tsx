'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { MediaUpload } from '@/components/admin/MediaUpload'
import { TimelineEditor } from '@/components/admin/TimelineEditor'
import { VideoManager } from '@/components/admin/VideoManager'
import { DataExport } from '@/components/admin/DataExport'
import { AdminPageInfo } from '@/components/admin/AdminPageInfo'
import { AdminPhotoGallery } from '@/components/admin/AdminPhotoGallery'
import { AdminQRCodeSection } from '@/components/admin/AdminQRCodeSection'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface MemorialPageRecord {
  id: string
  title: string
  slug: string
  full_name: string | null
  dob: string | null
  dod: string | null
  privacy: 'public' | 'private'
  hero_image_url: string | null
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
}

interface EditMemorialScreenProps {
  pageId: string
}

export function EditMemorialScreen({ pageId }: EditMemorialScreenProps) {
  const [page, setPage] = useState<MemorialPageRecord | null>(null)
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [redirects, setRedirects] = useState<RedirectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchPage = useCallback(async () => {
    setErrorMessage(null)
    const pageResponse = await fetch(`/api/admin/pages/${pageId}`, { cache: 'no-store' })
    if (!pageResponse.ok) {
      const payload = (await pageResponse.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to load memorial page.')
      setPage(null)
      setRedirects([])
      setPhotos([])
      setLoading(false)
      return
    }
    const pagePayload = (await pageResponse.json()) as { page: MemorialPageRecord }
    setPage(pagePayload.page)

    const [redirectsResponse, photosResponse] = await Promise.all([
      fetch(`/api/admin/pages/${pageId}/redirects`, { cache: 'no-store' }),
      fetch(`/api/admin/pages/${pageId}/photos`, { cache: 'no-store' }),
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
  }, [pageId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage()
  }, [fetchPage])

  const handleSetHero = async (photoUrl: string) => {
    setErrorMessage(null)
    const response = await fetch(`/api/admin/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroImageUrl: photoUrl }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      setErrorMessage(payload?.message || 'Unable to update hero image.')
      return
    }

    setPage((current) => (current ? { ...current, hero_image_url: photoUrl } : current))
  }

  if (loading) return <div className="surface-card p-8 text-sm text-muted-foreground">Loading memorial editor...</div>
  if (!page) return <div className="surface-card p-8 text-sm">Page not found.</div>

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Edit Memorial: {page.title}</h2>
          <p className="text-sm text-muted-foreground">Manage page info, media, timeline, and sharing tools.</p>
        </div>
        {page.privacy === 'public' && (
          <Button variant="outline" asChild>
            <Link href={`/memorials/${page.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              View Public Page
            </Link>
          </Button>
        )}
      </div>
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminPageInfo page={page} onUpdate={fetchPage} />

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Video Links (YouTube)</h3>
            <VideoManager pageId={pageId} />
          </section>

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Timeline Events</h3>
            <TimelineEditor pageId={pageId} />
          </section>

          <AdminQRCodeSection page={page} redirects={redirects} />

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Export Data</h3>
            <DataExport pageId={pageId} pageTitle={page.title} />
          </section>

          <section className="space-y-4">
            <h3 className="px-1 text-base font-semibold">Upload Photos</h3>
            <MediaUpload pageId={pageId} onUploadComplete={fetchPage} />
          </section>
        </div>

        <div className="space-y-6">
          <AdminPhotoGallery photos={photos} heroImageUrl={page.hero_image_url} onRefresh={fetchPage} onSetHero={handleSetHero} />
        </div>
      </div>
    </div>
  )
}
