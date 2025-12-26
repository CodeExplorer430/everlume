'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MediaUpload } from '@/components/admin/MediaUpload'
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator'
import { TimelineEditor } from '@/components/admin/TimelineEditor'
import { VideoManager } from '@/components/admin/VideoManager'
import { DataExport } from '@/components/admin/DataExport'
import { Trash2, ExternalLink, Star, Image as ImageIcon, Lock, Globe } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

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
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null)
  const [tempCaption, setTempCaption] = useState('')
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
        privacy: page.privacy,
      })
      .eq('id', id)
    
    if (error) alert(error.message)
    setUpdating(false)
  }

  const deletePhoto = async (photoId: string, storagePath: string, thumbPath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    await supabase.storage.from('tributes').remove([storagePath, thumbPath])
    await supabase.from('photos').delete().eq('id', photoId)
    
    fetchPage()
  }

  const setHeroImage = async (photoPath: string) => {
    const { data } = supabase.storage.from('tributes').getPublicUrl(photoPath)
    
    const { error } = await supabase
      .from('pages')
      .update({ hero_image_url: data.publicUrl })
      .eq('id', id)

    if (error) alert(error.message)
    else {
      setPage({ ...page, hero_image_url: data.publicUrl })
    }
  }

  const startEditingCaption = (photo: any) => {
    setEditingPhoto(photo.id)
    setTempCaption(photo.caption || '')
  }

  const saveCaption = async (photoId: string) => {
    const { error } = await supabase
      .from('photos')
      .update({ caption: tempCaption })
      .eq('id', photoId)

    if (error) alert(error.message)
    else {
      setEditingPhoto(null)
      fetchPage()
    }
  }

  const togglePrivacy = () => {
    setPage({ ...page, privacy: page.privacy === 'public' ? 'private' : 'public' })
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!page) return <div className="p-8">Page not found.</div>

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Edit Tribute: {page.title}</h2>
        <div className="flex space-x-4">
           {page.privacy === 'public' && (
            <Button variant="outline" asChild>
              <Link href={`/pages/${page.slug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Page
              </Link>
            </Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Edit Info */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleUpdate} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Basic Information</h3>
            
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
              <div className="flex items-center space-x-2">
                {page.privacy === 'public' ? <Globe className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-amber-600" />}
                <span className="text-sm font-medium text-gray-700 capitalize">{page.privacy} Mode</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={togglePrivacy}>
                Switch to {page.privacy === 'public' ? 'Private' : 'Public'}
              </Button>
            </div>

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
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Export Data</h3>
            <DataExport pageId={id} pageTitle={page.title} />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {photos.map((photo) => {
                   const publicUrl = supabase.storage.from('tributes').getPublicUrl(photo.thumb_path).data.publicUrl;
                   const isHero = page.hero_image_url && page.hero_image_url.includes(photo.storage_path.split('/').pop()); // Simple check

                   return (
                    <div key={photo.id} className="group flex flex-col space-y-2">
                      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={publicUrl}
                          alt={photo.caption}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-xs bg-white/90 hover:bg-white"
                            onClick={() => setHeroImage(photo.storage_path)}
                          >
                            <ImageIcon className="mr-1 h-3 w-3" />
                            Set as Hero
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => deletePhoto(photo.id, photo.storage_path, photo.thumb_path)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                        {isHero && (
                          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center">
                            <Star className="h-3 w-3 mr-1 fill-yellow-900" />
                            HERO
                          </div>
                        )}
                      </div>
                      
                      {/* Caption Edit */}
                      {editingPhoto === photo.id ? (
                        <div className="flex space-x-2">
                          <Input 
                            value={tempCaption} 
                            onChange={(e) => setTempCaption(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button size="sm" className="h-8 px-2" onClick={() => saveCaption(photo.id)}>Save</Button>
                        </div>
                      ) : (
                        <p 
                          className="text-xs text-gray-600 truncate cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => startEditingCaption(photo)}
                          title="Click to edit caption"
                        >
                          {photo.caption || 'Add caption...'}
                        </p>
                      )}
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