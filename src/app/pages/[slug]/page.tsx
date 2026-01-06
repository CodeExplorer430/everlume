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

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!page) return {}

  return {
    title: `${page.title} | Digital Tribute`,
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

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!page) {
    notFound()
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('page_id', page.id)
    .order('sort_index', { ascending: true })

  const { data: guestbook } = await supabase
    .from('guestbook')
    .select('*')
    .eq('page_id', page.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  const { data: timeline } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('page_id', page.id)
    .order('year', { ascending: true })

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('page_id', page.id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <TributeHero page={page} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        <section className="text-center space-y-6">
          <h2 className="text-3xl font-serif font-semibold text-foreground">Our Memories</h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Welcome to the digital tribute for {page.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message in the guestbook.
          </p>
        </section>

        {/* Gallery Section */}
        <section className="space-y-8">
          {photos && photos.length > 0 ? (
            <PublicGallery photos={photos} />
          ) : (
            <div className="text-center py-12 text-muted-foreground italic bg-secondary rounded-lg">
              No photos shared yet.
            </div>
          )}
        </section>

        <TributeVideos videos={videos || []} />

        <TributeTimeline timeline={timeline || []} />

        <TributeGuestbook 
          pageId={page.id} 
          fullName={page.full_name} 
          entries={guestbook || []} 
        />
      </main>

      <footer className="bg-card border-t border-border py-12 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} Digital Tribute — Created with love.</p>
      </footer>
    </div>
  )
}