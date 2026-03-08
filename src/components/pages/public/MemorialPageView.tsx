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
  memorial_theme?: 'classic' | 'serene' | 'editorial' | null
  memorial_slideshow_enabled?: boolean | null
  memorial_slideshow_interval_ms?: number | null
  memorial_video_layout?: 'grid' | 'featured' | null
  memorial_photo_fit?: 'cover' | 'contain' | null
  memorial_caption_style?: 'classic' | 'minimal' | null
}

type MemorialPhoto = {
  id: string
  image_url: string | null
  thumb_url: string | null
  caption: string | null
}

type MemorialVideo = {
  id: string
  provider: 'youtube' | 'cloudinary' | null
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
  memorial: MemorialPage
  photos: MemorialPhoto[]
  videos: MemorialVideo[]
  timeline: MemorialTimeline[]
  guestbook: MemorialGuestbook[]
}

export function MemorialPageView({ memorial, photos, videos, timeline, guestbook }: MemorialPageViewProps) {
  const slideshowEnabled = memorial.memorial_slideshow_enabled !== false
  const slideshowIntervalMs = Number(memorial.memorial_slideshow_interval_ms) || 4500
  const memorialVideoLayout = memorial.memorial_video_layout === 'featured' ? 'featured' : 'grid'
  const memorialPhotoFit = memorial.memorial_photo_fit === 'contain' ? 'contain' : 'cover'
  const memorialCaptionStyle = memorial.memorial_caption_style === 'minimal' ? 'minimal' : 'classic'
  const themePreset = memorial.memorial_theme === 'serene' || memorial.memorial_theme === 'editorial' ? memorial.memorial_theme : 'classic'
  const themeShellClass =
    themePreset === 'serene'
      ? 'bg-[radial-gradient(circle_at_12%_8%,rgba(164,194,173,0.24),transparent_44%),linear-gradient(180deg,#f3f7f3_0%,#edf3ee_100%)]'
      : themePreset === 'editorial'
        ? 'bg-[linear-gradient(180deg,#f6f1e8_0%,#eee6d7_100%)]'
        : ''

  return (
    <div className={`min-h-screen pb-14 ${themeShellClass}`} data-memorial-theme={themePreset}>
      <TributeHero memorial={memorial} />

      <main id="main-content" className="page-container space-y-12 py-10 md:space-y-16 md:py-14">
        <section className="surface-card mx-auto max-w-4xl px-6 py-8 text-center md:px-10">
          <p className="section-kicker">Remembrance</p>
          <h2 className="section-title mt-2">Our Memories</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Welcome to the memorial for {memorial.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message for the family.
          </p>
        </section>

        <section className="space-y-6">
          {photos.length > 0 ? (
            <PublicGallery
              photos={photos.map((photo) => ({ ...photo, caption: photo.caption ?? undefined }))}
              slideshowEnabled={slideshowEnabled}
              slideshowIntervalMs={slideshowIntervalMs}
              fit={memorialPhotoFit}
              captionStyle={memorialCaptionStyle}
            />
          ) : (
            <div className="surface-card py-12 text-center text-sm italic text-muted-foreground">No photos shared yet.</div>
          )}
        </section>

        <TributeVideos videos={videos} layout={memorialVideoLayout} />

        <TributeTimeline timeline={timeline} />

        <TributeGuestbook memorialId={memorial.id} fullName={memorial.full_name} entries={guestbook} />
      </main>

      <footer className="border-t border-border/80 py-10 text-center text-xs text-muted-foreground md:text-sm">
        <p>© {new Date().getFullYear()} Everlume</p>
      </footer>
    </div>
  )
}
