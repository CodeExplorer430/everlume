/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export function DataExport({ pageId, pageTitle }: DataExportProps) {
  const [loadingGuestbook, setLoadingGuestbook] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [loadingZip, setLoadingZip] = useState(false)
  const supabase = createClient()

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
    try {
      const { data, error } = await supabase
        .from('guestbook')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        alert('No guestbook entries to export.')
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
    } catch (err: any) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setLoadingGuestbook(false)
    }
  }

  const exportPhotoMetadata = async () => {
    setLoadingPhotos(true)
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, caption, cloudinary_public_id, image_url, thumb_url, taken_at, created_at')
        .eq('page_id', pageId)
        .order('sort_index', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) {
        alert('No photos to export.')
        return
      }

      const headers = ['ID', 'Caption', 'Cloudinary Public ID', 'Image URL', 'Thumb URL', 'Taken At', 'Uploaded At']
      const rows = (data as PhotoRow[]).map((photo) => [
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
    } catch (err: any) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setLoadingPhotos(false)
    }
  }

  const exportPhotosZip = async () => {
    setLoadingZip(true)
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, image_url, cloudinary_public_id')
        .eq('page_id', pageId)

      if (error) throw error
      if (!data || data.length === 0) {
        alert('No photos to export.')
        return
      }

      const zip = new JSZip()
      const folder = zip.folder('photos')

      for (const [index, photo] of data.entries()) {
        if (!photo.image_url) {
          continue
        }

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
    } catch (err: any) {
      alert(`ZIP export failed: ${err.message}`)
    } finally {
      setLoadingZip(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <Button variant="outline" onClick={exportGuestbook} disabled={loadingGuestbook} className="w-full justify-start">
        <FileText className="mr-2 h-4 w-4 text-blue-600" />
        {loadingGuestbook ? 'Exporting...' : 'Export Guestbook (CSV)'}
      </Button>

      <Button variant="outline" onClick={exportPhotoMetadata} disabled={loadingPhotos} className="w-full justify-start">
        <Images className="mr-2 h-4 w-4 text-purple-600" />
        {loadingPhotos ? 'Exporting...' : 'Export Photo Metadata (CSV)'}
      </Button>

      <Button variant="outline" onClick={exportPhotosZip} disabled={loadingZip} className="w-full justify-start">
        {loadingZip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4 text-amber-600" />}
        {loadingZip ? 'Preparing ZIP...' : 'Download All Photos (ZIP)'}
      </Button>
    </div>
  )
}
