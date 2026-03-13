import { PublicGallery } from '@/components/public/PublicGallery'
import { MemorialActionBar } from '@/components/public/MemorialActionBar'
import { ProtectedMediaConsentGate } from '@/components/public/ProtectedMediaConsentGate'
import { TributeHero } from '@/components/public/TributeHero'
import { TributeVideos } from '@/components/public/TributeVideos'
import { TributeTimeline } from '@/components/public/TributeTimeline'
import { TributeGuestbook } from '@/components/public/TributeGuestbook'

type MemorialPage = {
  id: string
  title: string
  full_name: string | null
  dedicationText?: string | null
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
  accessMode?: 'public' | 'password' | 'private'
  requiresMediaConsent?: boolean
  mediaConsentSlug?: string
  mediaConsentTitle?: string
  mediaConsentBody?: string
  mediaConsentVersion?: number
}

export function MemorialPageView({
  memorial,
  photos,
  videos,
  timeline,
  guestbook,
  accessMode = 'public',
  requiresMediaConsent = false,
  mediaConsentSlug,
  mediaConsentTitle,
  mediaConsentBody,
  mediaConsentVersion,
}: MemorialPageViewProps) {
  const slideshowEnabled = memorial.memorial_slideshow_enabled !== false
  const slideshowIntervalMs =
    Number(memorial.memorial_slideshow_interval_ms) || 4500
  const memorialVideoLayout =
    memorial.memorial_video_layout === 'featured' ? 'featured' : 'grid'
  const memorialPhotoFit =
    memorial.memorial_photo_fit === 'contain' ? 'contain' : 'cover'
  const memorialCaptionStyle =
    memorial.memorial_caption_style === 'minimal' ? 'minimal' : 'classic'
  const themePreset =
    memorial.memorial_theme === 'serene' ||
    memorial.memorial_theme === 'editorial'
      ? memorial.memorial_theme
      : 'classic'
  const themeShellClass =
    themePreset === 'serene'
      ? 'bg-[radial-gradient(circle_at_12%_8%,rgba(164,194,173,0.24),transparent_44%),linear-gradient(180deg,#f3f7f3_0%,#edf3ee_100%)]'
      : themePreset === 'editorial'
        ? 'bg-[linear-gradient(180deg,#f6f1e8_0%,#eee6d7_100%)]'
        : ''

  const remembranceCopy =
    memorial.dedicationText?.trim() ||
    `Welcome to the memorial for ${memorial.full_name || 'our loved one'}. We invite you to explore the gallery and leave a message for the family.`
  const sectionLinks = [
    { href: '#remembrance', label: 'Remembrance' },
    { href: '#photos', label: 'Gallery' },
    ...(!requiresMediaConsent ? [{ href: '#videos', label: 'Videos' }] : []),
    { href: '#timeline', label: 'Timeline' },
    { href: '#guestbook', label: 'Guestbook' },
  ]

  return (
    <div
      className={`page-shell min-h-screen pb-14 ${themeShellClass}`}
      data-memorial-theme={themePreset}
      data-memorial-access={accessMode}
    >
      <TributeHero memorial={memorial} />

      <main
        id="main-content"
        className="page-container memorial-print-layout space-y-12 py-10 md:space-y-16 md:py-14"
      >
        <MemorialActionBar
          memorialTitle={memorial.title}
          sectionLinks={sectionLinks}
        />

        <section
          id="remembrance"
          className="surface-card print-avoid-break mx-auto max-w-4xl px-6 py-8 text-center md:px-10"
        >
          <p className="section-kicker">Remembrance</p>
          <h2 className="section-title mt-2">Our Memories</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {remembranceCopy}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="status-pill">Theme: {themePreset}</span>
            <span className="status-pill">Access: {accessMode}</span>
          </div>
        </section>

        <section id="photos" className="space-y-6 print-avoid-break">
          {requiresMediaConsent && mediaConsentSlug ? (
            <ProtectedMediaConsentGate
              slug={mediaConsentSlug}
              title={mediaConsentTitle}
              body={mediaConsentBody}
              version={mediaConsentVersion}
            />
          ) : photos.length > 0 ? (
            <PublicGallery
              photos={photos.map((photo) => ({
                ...photo,
                caption: photo.caption ?? undefined,
              }))}
              slideshowEnabled={slideshowEnabled}
              slideshowIntervalMs={slideshowIntervalMs}
              fit={memorialPhotoFit}
              captionStyle={memorialCaptionStyle}
            />
          ) : (
            <div className="surface-card mx-auto max-w-3xl px-6 py-12 text-center">
              <p className="section-kicker">Gallery</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Photos will be added here
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The family has opened this memorial before the gallery is
                complete. Return later for portraits, keepsakes, and shared
                photographs.
              </p>
            </div>
          )}
        </section>

        {!requiresMediaConsent && (
          <TributeVideos videos={videos} layout={memorialVideoLayout} />
        )}

        <TributeTimeline timeline={timeline} />

        <TributeGuestbook
          memorialId={memorial.id}
          fullName={memorial.full_name}
          entries={guestbook}
        />
      </main>

      <footer
        className="border-t border-border/80 py-10 text-center text-xs text-muted-foreground md:text-sm"
        data-print-hide="true"
      >
        <p>© {new Date().getFullYear()} Everlume</p>
      </footer>
    </div>
  )
}
