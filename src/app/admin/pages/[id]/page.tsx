'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MediaUpload } from '@/components/admin/MediaUpload'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'
import { TimelineEditor } from '@/components/admin/TimelineEditor'
import { VideoManager } from '@/components/admin/VideoManager'
import { Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditTributePage({ params }: PageProps) {
  const { id } = use(params)
  const [page, setPage] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const fetchPage = useCallback(async () => {
    const { data: pageData } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .single()
    
    setPage(pageData)

    const { data: photoData } = await supabase
      .from('photos')
      .select('*')
      .eq('page_id', id)
      .order('sort_index', { ascending: true })
    
    setPhotos(photoData || [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    const { error } = await supabase
      .from('pages')
      .update({
        title: page.title,
        slug: page.slug,
        full_name: page.full_name,
        dob: page.dob,
        dod: page.dod,
      })
      .eq('id', id)
    
    if (error) alert(error.message)
    setUpdating(false)
  }

  const deletePhoto = async (photoId: string, storagePath: string, thumbPath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    // Delete from storage
    await supabase.storage.from('tributes').remove([storagePath, thumbPath])
    
    // Delete from database
    await supabase.from('photos').delete().eq('id', photoId)
    
    fetchPage()
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!page) return <div className="p-8">Page not found.</div>

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Edit Tribute: {page.title}</h2>
        <Button variant="outline" asChild>
          <Link href={`/pages/${page.slug}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Public Page
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Edit Info */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleUpdate} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Page Title</label>
              <Input
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slug</label>
              <Input
                value={page.slug}
                onChange={(e) => setPage({ ...page, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <Input
                value={page.full_name || ''}
                onChange={(e) => setPage({ ...page, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">DOB</label>
                <Input
                  type="date"
                  value={page.dob || ''}
                  onChange={(e) => setPage({ ...page, dob: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">DOD</label>
                <Input
                  type="date"
                  value={page.dod || ''}
                  onChange={(e) => setPage({ ...page, dod: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Video Links (YouTube)</h3>
            <VideoManager pageId={id} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Timeline Events</h3>
            <TimelineEditor pageId={id} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">QR Code for Plaque</h3>
            <div className="flex flex-col items-center space-y-4">
               <QRCodeGenerator url={`${window.location.origin}/pages/${page.slug}`} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Upload Photos</h3>
            <MediaUpload pageId={id} onUploadComplete={fetchPage} />
          </div>
        </div>

        {/* Right: Photo Gallery */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-6">Photo Gallery</h3>
            
            {photos.length === 0 ? (
              <p className="text-center py-12 text-gray-500 italic">No photos uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo) => {
                   const publicUrl = supabase.storage.from('tributes').getPublicUrl(photo.thumb_path).data.publicUrl;
                   return (
                    <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={publicUrl}
                        alt={photo.caption}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button
                          onClick={() => deletePhoto(photo.id, photo.storage_path, photo.thumb_path)}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                   )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
