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
    const { data: pageData } = await supabase.from('pages').select('*').eq('id', id).single()

    setPage(pageData)

    const { data: redirectData } = await supabase.from('redirects').select('*').ilike('target_url', `%${pageData.slug}%`)

    setRedirects(redirectData || [])

    const { data: photoData } = await supabase.from('photos').select('*').eq('page_id', id).order('sort_index', { ascending: true })

    setPhotos(photoData || [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage()
  }, [fetchPage])

  const handleSetHero = async (photoUrl: string) => {
    const { error } = await supabase.from('pages').update({ hero_image_url: photoUrl }).eq('id', id)

    if (error) alert(error.message)
    else {
      setPage({ ...page, hero_image_url: photoUrl })
    }
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminPageInfo page={page} onUpdate={fetchPage} />

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Video Links (YouTube)</h3>
            <VideoManager pageId={id} />
          </section>

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Timeline Events</h3>
            <TimelineEditor pageId={id} />
          </section>

          <AdminQRCodeSection page={page} redirects={redirects} />

          <section className="surface-card space-y-4 p-6">
            <h3 className="border-b border-border pb-2 text-base font-semibold">Export Data</h3>
            <DataExport pageId={id} pageTitle={page.title} />
          </section>

          <section className="space-y-4">
            <h3 className="px-1 text-base font-semibold">Upload Photos</h3>
            <MediaUpload pageId={id} onUploadComplete={fetchPage} />
          </section>
        </div>

        <div className="space-y-6">
          <AdminPhotoGallery photos={photos} heroImageUrl={page.hero_image_url} onRefresh={fetchPage} onSetHero={handleSetHero} />
        </div>
      </div>
    </div>
  )
}
