'use client'

import { useState } from 'react'
import { Archive, FileJson, FileText, Images, Loader2 } from 'lucide-react'
import JSZip from 'jszip'
import { Button } from '@/components/ui/button'

interface DataExportProps {
  memorialId: string
  memorialTitle: string
}

type PhotoRow = {
  id: string
  caption: string | null
  image_url: string | null
  thumb_url: string | null
  cloudinary_public_id: string | null
  created_at: string
  taken_at: string | null
}

type GuestbookRow = {
  id: string
  name: string
  email: string | null
  message: string
  is_approved: boolean
  created_at: string
}

type VideoRow = {
  id: string
  provider: string
  provider_id: string
  title: string | null
  created_at: string
}

type TimelineRow = {
  id: string
  year: number
  text: string
}

type RedirectRow = {
  id: string
  shortcode: string
  target_url: string
  print_status: 'unverified' | 'verified'
  last_verified_at: string | null
  is_active: boolean
  created_at: string
}

type MediaConsentRow = {
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

type MemorialRow = {
  id: string
  title: string
  slug: string
  full_name: string | null
  dob: string | null
  dod: string | null
  accessMode: 'public' | 'private' | 'password'
  access_mode?: 'public' | 'private' | 'password'
  hero_image_url?: string | null
  memorial_theme?: string | null
  memorial_slideshow_enabled?: boolean | null
  memorial_slideshow_interval_ms?: number | null
  memorial_video_layout?: string | null
  memorial_photo_fit?: string | null
  memorial_caption_style?: string | null
  qr_template?: string | null
  qr_caption?: string | null
  qr_foreground_color?: string | null
  qr_background_color?: string | null
  qr_frame_style?: string | null
  qr_caption_font?: string | null
  qr_show_logo?: boolean | null
  created_at?: string
  updated_at?: string
}

function sanitizeFileStem(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'memorial'
}

export function DataExport({ memorialId, memorialTitle }: DataExportProps) {
  const [loadingGuestbook, setLoadingGuestbook] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [loadingZip, setLoadingZip] = useState(false)
  const [loadingPackage, setLoadingPackage] = useState(false)
  const [loadingConsent, setLoadingConsent] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadCSV = (content: string, filename: string) => {
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), filename)
  }

  const downloadJSON = (content: unknown, filename: string) => {
    downloadBlob(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8;' }), filename)
  }

  const readJsonOrThrow = async <T,>(response: Response, defaultMessage: string): Promise<T> => {
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(payload?.message || defaultMessage)
    }

    return (await response.json()) as T
  }

  const exportGuestbook = async () => {
    setLoadingGuestbook(true)
    setNoticeMessage(null)
    setErrorMessage(null)

    try {
      const payload = await readJsonOrThrow<{ entries?: GuestbookRow[] }>(
        await fetch(`/api/admin/memorials/${memorialId}/guestbook`, { cache: 'no-store' }),
        'Unable to load guestbook entries.'
      )
      const data = payload.entries ?? []

      if (data.length === 0) {
        setNoticeMessage('No guestbook entries to export.')
        return
      }

      const headers = ['Name', 'Email', 'Message', 'Date', 'Approved']
      const rows = data.map((entry) => [
        `"${entry.name?.replace(/"/g, '""') || ''}"`,
        `"${entry.email?.replace(/"/g, '""') || ''}"`,
        `"${entry.message?.replace(/"/g, '""') || ''}"`,
        `"${new Date(entry.created_at).toLocaleString()}"`,
        entry.is_approved ? 'Yes' : 'No',
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      downloadCSV(csvContent, `${sanitizeFileStem(memorialTitle)}_guestbook.csv`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setErrorMessage(`Export failed: ${message}`)
    } finally {
      setLoadingGuestbook(false)
    }
  }

  const exportPhotoMetadata = async () => {
    setLoadingPhotos(true)
    setNoticeMessage(null)
    setErrorMessage(null)

    try {
      const payload = await readJsonOrThrow<{ photos?: PhotoRow[] }>(
        await fetch(`/api/admin/memorials/${memorialId}/photos`, { cache: 'no-store' }),
        'Unable to load photos.'
      )
      const data = payload.photos ?? []

      if (data.length === 0) {
        setNoticeMessage('No photos to export.')
        return
      }

      const headers = ['ID', 'Caption', 'Cloudinary Public ID', 'Image URL', 'Thumb URL', 'Taken At', 'Uploaded At']
      const rows = data.map((photo) => [
        photo.id,
        `"${photo.caption?.replace(/"/g, '""') || ''}"`,
        photo.cloudinary_public_id || '',
        photo.image_url || '',
        photo.thumb_url || '',
        photo.taken_at || '',
        `"${new Date(photo.created_at).toLocaleString()}"`,
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      downloadCSV(csvContent, `${sanitizeFileStem(memorialTitle)}_photo_metadata.csv`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setErrorMessage(`Export failed: ${message}`)
    } finally {
      setLoadingPhotos(false)
    }
  }

  const exportPhotosZip = async () => {
    setLoadingZip(true)
    setNoticeMessage(null)
    setErrorMessage(null)

    try {
      const payload = await readJsonOrThrow<{ photos?: PhotoRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/photos`, { cache: 'no-store' }), 'Unable to load photos.')
      const data = payload.photos ?? []

      if (data.length === 0) {
        setNoticeMessage('No photos to export.')
        return
      }

      const zip = new JSZip()
      const folder = zip.folder('photos')

      for (const [index, photo] of data.entries()) {
        if (!photo.image_url) continue

        const imageResponse = await fetch(photo.image_url)
        if (!imageResponse.ok) {
          console.error(`Error downloading ${photo.image_url}:`, imageResponse.statusText)
          continue
        }

        const fileBytes = await imageResponse.arrayBuffer()
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        const publicIdSegment = photo.cloudinary_public_id?.split('/').pop()
        const extension = contentType.split('/').pop() || 'jpg'
        const fileName = publicIdSegment ? `${publicIdSegment}.${extension}` : `photo_${index + 1}.${extension}`
        folder?.file(fileName, fileBytes)
      }

      const content = await zip.generateAsync({ type: 'blob' })
      downloadBlob(content, `${sanitizeFileStem(memorialTitle)}_photos.zip`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ZIP export failed.'
      setErrorMessage(`ZIP export failed: ${message}`)
    } finally {
      setLoadingZip(false)
    }
  }

  const exportMemorialPackage = async () => {
    setLoadingPackage(true)
    setNoticeMessage(null)
    setErrorMessage(null)

    try {
      const [memorialPayload, photosPayload, videosPayload, timelinePayload, guestbookPayload, redirectsPayload, consentPayload] = await Promise.all([
        readJsonOrThrow<{ memorial?: MemorialRow }>(await fetch(`/api/admin/memorials/${memorialId}`, { cache: 'no-store' }), 'Unable to load memorial details.'),
        readJsonOrThrow<{ photos?: PhotoRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/photos`, { cache: 'no-store' }), 'Unable to load photos.'),
        readJsonOrThrow<{ videos?: VideoRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/videos`, { cache: 'no-store' }), 'Unable to load videos.'),
        readJsonOrThrow<{ events?: TimelineRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/timeline`, { cache: 'no-store' }), 'Unable to load timeline events.'),
        readJsonOrThrow<{ entries?: GuestbookRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/guestbook`, { cache: 'no-store' }), 'Unable to load guestbook entries.'),
        readJsonOrThrow<{ redirects?: RedirectRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/redirects`, { cache: 'no-store' }), 'Unable to load redirects.'),
        readJsonOrThrow<{ logs?: MediaConsentRow[] }>(await fetch(`/api/admin/memorials/${memorialId}/media-consent`, { cache: 'no-store' }), 'Unable to load protected media consent records.'),
      ])

      const memorial = memorialPayload.memorial
      if (!memorial) {
        throw new Error('Unable to load memorial details.')
      }

      downloadJSON(
        {
          exported_at: new Date().toISOString(),
          memorialId,
          memorialTitle: memorial.title || memorialTitle,
          memorial,
          photos: photosPayload.photos ?? [],
          videos: videosPayload.videos ?? [],
          timeline: timelinePayload.events ?? [],
          guestbook: guestbookPayload.entries ?? [],
          redirects: redirectsPayload.redirects ?? [],
          mediaConsent: consentPayload.logs ?? [],
        },
        `${sanitizeFileStem(memorialTitle)}_memorial_package.json`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'JSON export failed.'
      setErrorMessage(`JSON export failed: ${message}`)
    } finally {
      setLoadingPackage(false)
    }
  }

  const exportMediaConsent = async () => {
    setLoadingConsent(true)
    setNoticeMessage(null)
    setErrorMessage(null)

    try {
      const payload = await readJsonOrThrow<{ logs?: MediaConsentRow[] }>(
        await fetch(`/api/admin/memorials/${memorialId}/media-consent`, { cache: 'no-store' }),
        'Unable to load protected media consent records.'
      )
      const data = payload.logs ?? []

      if (data.length === 0) {
        setNoticeMessage('No protected media consent records to export.')
        return
      }

      const headers = ['Event', 'Media Kind', 'Media Variant', 'Access Mode', 'Consent Version', 'Consent Source', 'IP Hash', 'User Agent Hash', 'Recorded At']
      const rows = data.map((entry) => [
        entry.event_type,
        entry.media_kind || '',
        entry.media_variant || '',
        entry.access_mode,
        String(entry.consent_version || 1),
        entry.consent_source,
        entry.ip_hash,
        entry.user_agent_hash,
        `"${new Date(entry.created_at).toLocaleString()}"`,
      ])

      downloadCSV([headers.join(','), ...rows.map((row) => row.join(','))].join('\n'), `${sanitizeFileStem(memorialTitle)}_media_consent.csv`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setErrorMessage(`Export failed: ${message}`)
    } finally {
      setLoadingConsent(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-secondary/35 p-4">
        <p className="text-sm font-medium text-foreground">Memorial export center</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Export guestbook, media metadata, and a full memorial JSON package for handoff or archive review. Photo ZIP downloads the current
          image files only. Automated backups remain the operational recovery path.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button variant="outline" onClick={exportMemorialPackage} disabled={loadingPackage} className="w-full justify-start">
          {loadingPackage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
          {loadingPackage ? 'Preparing package...' : 'Export Memorial Package (JSON)'}
        </Button>

        <Button variant="outline" onClick={exportGuestbook} disabled={loadingGuestbook} className="w-full justify-start">
          <FileText className="mr-2 h-4 w-4" />
          {loadingGuestbook ? 'Exporting...' : 'Export Guestbook (CSV)'}
        </Button>

        <Button variant="outline" onClick={exportMediaConsent} disabled={loadingConsent} className="w-full justify-start">
          <FileText className="mr-2 h-4 w-4" />
          {loadingConsent ? 'Exporting...' : 'Export Media Consent (CSV)'}
        </Button>

        <Button variant="outline" onClick={exportPhotoMetadata} disabled={loadingPhotos} className="w-full justify-start">
          <Images className="mr-2 h-4 w-4" />
          {loadingPhotos ? 'Exporting...' : 'Export Photo Metadata (CSV)'}
        </Button>

        <Button variant="outline" onClick={exportPhotosZip} disabled={loadingZip} className="w-full justify-start">
          {loadingZip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
          {loadingZip ? 'Preparing ZIP...' : 'Download All Photos (ZIP)'}
        </Button>
      </div>

      {noticeMessage && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{noticeMessage}</p>}
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}
