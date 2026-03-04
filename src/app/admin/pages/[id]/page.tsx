/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback, use, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
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

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditTributePage({ params }: PageProps) {
  const { id } = use(params)
  const [page, setPage] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [redirects, setRedirects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchPage = useCallback(async () => {
    const { data: pageData } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .single()
    
    setPage(pageData)

    // Fetch related shortcodes
    const { data: redirectData } = await supabase
      .from('redirects')
      .select('*')
      .ilike('target_url', `%${pageData.slug}%`)
    
    setRedirects(redirectData || [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSetHero = async (photoUrl: string) => {
    const { error } = await supabase
      .from('pages')
      .update({ hero_image_url: photoUrl })
      .eq('id', id)

    if (error) alert(error.message)
    else {
      setPage({ ...page, hero_image_url: photoUrl })
    }
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
          <AdminPageInfo page={page} onUpdate={fetchPage} />

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Video Links (YouTube)</h3>
            <VideoManager pageId={id} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Timeline Events</h3>
            <TimelineEditor pageId={id} />
          </div>

          <AdminQRCodeSection page={page} redirects={redirects} />

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
          <AdminPhotoGallery 
            photos={photos} 
            heroImageUrl={page.hero_image_url}
            onRefresh={fetchPage}
            onSetHero={handleSetHero}
          />
        </div>
      </div>
    </div>
  )
}
