'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Images, Archive, Loader2 } from 'lucide-react'
import JSZip from 'jszip'

interface DataExportProps {
  pageId: string
  pageTitle: string
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

export function DataExport({ pageId, pageTitle }: DataExportProps) {
  const [loadingGuestbook, setLoadingGuestbook] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [loadingZip, setLoadingZip] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportGuestbook = async () => {
    setLoadingGuestbook(true)
      setNoticeMessage(null)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/admin/pages/${pageId}/guestbook`, { cache: 'no-store' })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Unable to load guestbook entries.')
      }
      const payload = (await response.json()) as { entries?: GuestbookRow[] }
      const data = payload.entries ?? []

      if (!data || data.length === 0) {
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

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      downloadCSV(csvContent, `${pageTitle.replace(/[^a-z0-9]/gi, '_')}_guestbook.csv`)
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
      const response = await fetch(`/api/admin/pages/${pageId}/photos`, { cache: 'no-store' })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Unable to load photos.')
      }
      const payload = (await response.json()) as { photos?: PhotoRow[] }
      const data = payload.photos ?? []

      if (!data || data.length === 0) {
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

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      downloadCSV(csvContent, `${pageTitle.replace(/[^a-z0-9]/gi, '_')}_photo_metadata.csv`)
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
      const response = await fetch(`/api/admin/pages/${pageId}/photos`, { cache: 'no-store' })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || 'Unable to load photos.')
      }
      const payload = (await response.json()) as { photos?: PhotoRow[] }
      const data = payload.photos ?? []

      if (!data || data.length === 0) {
        setNoticeMessage('No photos to export.')
        return
      }

      const zip = new JSZip()
      const folder = zip.folder('photos')

      for (const [index, photo] of data.entries()) {
        if (!photo.image_url) continue

        const imageRes = await fetch(photo.image_url)
        if (!imageRes.ok) {
          console.error(`Error downloading ${photo.image_url}:`, imageRes.statusText)
          continue
        }

        const blob = await imageRes.blob()
        const publicIdSegment = photo.cloudinary_public_id?.split('/').pop()
        const extension = blob.type.split('/').pop() || 'jpg'
        const fileName = publicIdSegment ? `${publicIdSegment}.${extension}` : `photo_${index + 1}.${extension}`
        folder?.file(fileName, blob)
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `${pageTitle.replace(/[^a-z0-9]/gi, '_')}_photos.zip`
      link.click()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ZIP export failed.'
      setErrorMessage(`ZIP export failed: ${message}`)
    } finally {
      setLoadingZip(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <Button variant="outline" onClick={exportGuestbook} disabled={loadingGuestbook} className="w-full justify-start">
        <FileText className="mr-2 h-4 w-4" />
        {loadingGuestbook ? 'Exporting...' : 'Export Guestbook (CSV)'}
      </Button>

      <Button variant="outline" onClick={exportPhotoMetadata} disabled={loadingPhotos} className="w-full justify-start">
        <Images className="mr-2 h-4 w-4" />
        {loadingPhotos ? 'Exporting...' : 'Export Photo Metadata (CSV)'}
      </Button>

      <Button variant="outline" onClick={exportPhotosZip} disabled={loadingZip} className="w-full justify-start">
        {loadingZip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
        {loadingZip ? 'Preparing ZIP...' : 'Download All Photos (ZIP)'}
      </Button>
      {noticeMessage && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{noticeMessage}</p>}
      {errorMessage && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}
