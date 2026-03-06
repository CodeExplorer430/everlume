import { PublicGallery } from '@/components/public/PublicGallery'
import { TributeHero } from '@/components/public/TributeHero'
import { TributeVideos } from '@/components/public/TributeVideos'
import { TributeTimeline } from '@/components/public/TributeTimeline'
import { TributeGuestbook } from '@/components/public/TributeGuestbook'

type MemorialPage = {
  id: string
  title: string
  full_name: string | null
  hero_image_url: string | null
  dob: string | null
  dod: string | null
}

type MemorialPhoto = {
  id: string
  image_url: string | null
  thumb_url: string | null
  caption: string | null
}

type MemorialVideo = {
  id: string
  provider_id: string
  title: string | null
}

type MemorialTimeline = {
  id: string
  year: number
  text: string
}

type MemorialGuestbook = {
  id: string
  name: string
  message: string
  created_at: string
}

interface MemorialPageViewProps {
  page: MemorialPage
  photos: MemorialPhoto[]
  videos: MemorialVideo[]
  timeline: MemorialTimeline[]
  guestbook: MemorialGuestbook[]
}

export function MemorialPageView({ page, photos, videos, timeline, guestbook }: MemorialPageViewProps) {
  return (
    <div className="min-h-screen pb-14">
      <TributeHero page={page} />

      <main id="main-content" className="page-container space-y-12 py-10 md:space-y-16 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h2 className="section-title">Our Memories</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Welcome to the memorial page for {page.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message for the family.
          </p>
        </section>

        <section className="space-y-6">
          {photos.length > 0 ? (
            <PublicGallery photos={photos.map((photo) => ({ ...photo, caption: photo.caption ?? undefined }))} />
          ) : (
            <div className="surface-card py-12 text-center text-sm italic text-muted-foreground">No photos shared yet.</div>
          )}
        </section>

        <TributeVideos videos={videos} />

        <TributeTimeline timeline={timeline} />

        <TributeGuestbook pageId={page.id} fullName={page.full_name} entries={guestbook} />
      </main>

      <footer className="border-t border-border/80 py-10 text-center text-xs text-muted-foreground md:text-sm">
        <p>© {new Date().getFullYear()} Everlume</p>
      </footer>
    </div>
  )
}
