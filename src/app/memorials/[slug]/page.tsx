import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicGallery } from '@/components/public/PublicGallery'
import { TributeHero } from '@/components/public/TributeHero'
import { TributeVideos } from '@/components/public/TributeVideos'
import { TributeTimeline } from '@/components/public/TributeTimeline'
import { TributeGuestbook } from '@/components/public/TributeGuestbook'
import { Metadata } from 'next'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase.from('pages').select('*').eq('slug', slug).single()

  if (!page) return {}

  return {
    title: `${page.title} | Everlume`,
    description: `A digital memorial for ${page.full_name || 'our loved one'}.`,
    openGraph: {
      title: page.title,
      description: `A digital memorial for ${page.full_name || 'our loved one'}.`,
      images: page.hero_image_url ? [page.hero_image_url] : [],
      type: 'website',
    },
  }
}

export default async function PublicTributePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase.from('pages').select('*').eq('slug', slug).single()

  if (!page) {
    notFound()
  }

  const { data: photos } = await supabase.from('photos').select('*').eq('page_id', page.id).order('sort_index', { ascending: true })

  const { data: guestbook } = await supabase
    .from('guestbook')
    .select('*')
    .eq('page_id', page.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  const { data: timeline } = await supabase.from('timeline_events').select('*').eq('page_id', page.id).order('year', { ascending: true })

  const { data: videos } = await supabase.from('videos').select('*').eq('page_id', page.id).order('created_at', { ascending: true })

  return (
    <div className="min-h-screen pb-14">
      <TributeHero page={page} />

      <main className="page-container space-y-12 py-10 md:space-y-16 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h2 className="section-title">Our Memories</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Welcome to the memorial page for {page.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message for the family.
          </p>
        </section>

        <section className="space-y-6">
          {photos && photos.length > 0 ? (
            <PublicGallery photos={photos} />
          ) : (
            <div className="surface-card py-12 text-center text-sm italic text-muted-foreground">No photos shared yet.</div>
          )}
        </section>

        <TributeVideos videos={videos || []} />

        <TributeTimeline timeline={timeline || []} />

        <TributeGuestbook pageId={page.id} fullName={page.full_name} entries={guestbook || []} />
      </main>

      <footer className="border-t border-border/80 py-10 text-center text-xs text-muted-foreground md:text-sm">
        <p>© {new Date().getFullYear()} Everlume</p>
      </footer>
    </div>
  )
}
