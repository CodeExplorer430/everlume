'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FileText, Images } from 'lucide-react'

interface DataExportProps {
  pageId: string
  pageTitle: string
}

export function DataExport({ pageId, pageTitle }: DataExportProps) {
  const [loadingGuestbook, setLoadingGuestbook] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
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

      // CSV Header
      const headers = ['Name', 'Email', 'Message', 'Date', 'Approved']
      const rows = data.map(entry => [
        `"${entry.name?.replace(/"/g, '""') || ''}"`,
        `"${entry.email?.replace(/"/g, '""') || ''}"`,
        `"${entry.message?.replace(/"/g, '""') || ''}"`,
        `"${new Date(entry.created_at).toLocaleString()}"`,
        entry.is_approved ? 'Yes' : 'No'
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
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
        .select('*')
        .eq('page_id', pageId)
        .order('sort_index', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        alert('No photos to export.')
        return
      }

      // CSV Header
      const headers = ['ID', 'Caption', 'Storage Path', 'Taken At', 'Uploaded At']
      const rows = data.map(photo => [
        photo.id,
        `"${photo.caption?.replace(/"/g, '""') || ''}"`,
        photo.storage_path,
        photo.taken_at || '',
        `"${new Date(photo.created_at).toLocaleString()}"`
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      downloadCSV(csvContent, `${pageTitle.replace(/[^a-z0-9]/gi, '_')}_photos.csv`)

    } catch (err: any) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setLoadingPhotos(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <Button 
        variant="outline" 
        onClick={exportGuestbook} 
        disabled={loadingGuestbook}
        className="w-full justify-start"
      > 
        <FileText className="mr-2 h-4 w-4 text-blue-600" />
        {loadingGuestbook ? 'Exporting...' : 'Export Guestbook (CSV)'}
      </Button>
      
      <Button 
        variant="outline" 
        onClick={exportPhotoMetadata} 
        disabled={loadingPhotos}
        className="w-full justify-start"
      >
        <Images className="mr-2 h-4 w-4 text-purple-600" />
        {loadingPhotos ? 'Exporting...' : 'Export Photo Metadata (CSV)'}
      </Button>
    </div>
  )
}
