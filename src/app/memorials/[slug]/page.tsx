import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { MemorialPageView } from '@/components/pages/public/MemorialPageView'
import { canAccessMemorial, memorialRequiresProtectedMedia } from '@/lib/server/page-access'
import { createSignedMediaToken } from '@/lib/server/private-media'
import { PageUnlockForm } from '@/components/public/PageUnlockForm'
import { getE2EMemorialFixtureBySlug } from '@/lib/server/e2e-public-fixtures'
import { resolveMemorialAccessMode } from '@/lib/server/memorials'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const fixture = getE2EMemorialFixtureBySlug(slug)
  const memorial = fixture?.memorial

  if (memorial) {
    if (resolveMemorialAccessMode(memorial) !== 'public') {
      const access = await canAccessMemorial(memorial)
      if (!access.allowed && !access.requiresPassword) {
        return {
          title: 'Private Memorial | Everlume',
          robots: { index: false, follow: false },
        }
      }

      if (!access.allowed && access.requiresPassword) {
        return {
          title: 'Password Protected Memorial | Everlume',
          robots: { index: false, follow: false },
        }
      }
    }

    return {
      title: `${memorial.title} | Everlume`,
      description: `A digital memorial for ${memorial.full_name || 'our loved one'}.`,
      openGraph: {
        title: memorial.title,
        description: `A digital memorial for ${memorial.full_name || 'our loved one'}.`,
        images: memorial.hero_image_url ? [memorial.hero_image_url] : [],
        type: 'website',
      },
    }
  }

  const supabase = await createClient()
  const { data: databasePage } = await supabase.from('pages').select('*').eq('slug', slug).single()

  if (!databasePage) return {}

  if (resolveMemorialAccessMode(databasePage) !== 'public') {
    const access = await canAccessMemorial(databasePage)
    if (!access.allowed && !access.requiresPassword) {
      return {
        title: 'Private Memorial | Everlume',
        robots: { index: false, follow: false },
      }
    }

    if (!access.allowed && access.requiresPassword) {
      return {
        title: 'Password Protected Memorial | Everlume',
        robots: { index: false, follow: false },
      }
    }
  }

  return {
    title: `${databasePage.title} | Everlume`,
    description: `A digital memorial for ${databasePage.full_name || 'our loved one'}.`,
    openGraph: {
      title: databasePage.title,
      description: `A digital memorial for ${databasePage.full_name || 'our loved one'}.`,
      images: databasePage.hero_image_url ? [databasePage.hero_image_url] : [],
      type: 'website',
    },
  }
}

export default async function PublicTributePage({ params }: PageProps) {
  const { slug } = await params
  const fixture = getE2EMemorialFixtureBySlug(slug)
  const supabase = fixture ? null : await createClient()

  const memorial =
    fixture?.memorial ||
    (await supabase!.from('pages').select('*').eq('slug', slug).single()).data
  const siteSettings =
    fixture?.siteSettings ||
    (
      await supabase!
        .from('site_settings')
        .select('memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout')
        .eq('id', 1)
        .single()
    ).data

  if (!memorial) {
    notFound()
  }

  if (resolveMemorialAccessMode(memorial) !== 'public') {
    const access = await canAccessMemorial(memorial)
    if (!access.allowed && !access.requiresPassword) {
      notFound()
    }

    if (!access.allowed && access.requiresPassword) {
      return <PageUnlockForm slug={slug} />
    }
  }

  const photos =
    fixture?.photos ||
    (await supabase!.from('photos').select('*').eq('page_id', memorial.id).order('sort_index', { ascending: true })).data ||
    []

  const guestbook =
    fixture?.guestbook.filter((entry) => entry.is_approved) ||
    (
      await supabase!
        .from('guestbook')
        .select('*')
        .eq('page_id', memorial.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
    ).data ||
    []

  const timeline =
    fixture?.timeline ||
    (await supabase!.from('timeline_events').select('*').eq('page_id', memorial.id).order('year', { ascending: true })).data ||
    []

  const videos =
    fixture?.videos ||
    (await supabase!.from('videos').select('*').eq('page_id', memorial.id).order('created_at', { ascending: true })).data ||
    []

  const resolvedPhotos =
    memorialRequiresProtectedMedia(memorial)
      ? photos.map((photo) => {
          const imageToken = createSignedMediaToken(photo.id, 'image')
          const thumbToken = createSignedMediaToken(photo.id, 'thumb')
          return {
            ...photo,
            image_url: `/api/public/media/${photo.id}?variant=image&token=${encodeURIComponent(imageToken)}`,
            thumb_url: `/api/public/media/${photo.id}?variant=thumb&token=${encodeURIComponent(thumbToken)}`,
          }
        })
      : photos

  const resolvedMemorial = {
    ...memorial,
    memorial_slideshow_enabled:
      memorial.memorial_slideshow_enabled ?? (siteSettings?.memorial_slideshow_enabled !== false),
    memorial_slideshow_interval_ms: memorial.memorial_slideshow_interval_ms ?? (Number(siteSettings?.memorial_slideshow_interval_ms) || 4500),
    memorial_video_layout:
      memorial.memorial_video_layout ?? (siteSettings?.memorial_video_layout === 'featured' ? 'featured' : 'grid'),
  }

  return (
    <MemorialPageView
      memorial={resolvedMemorial}
      photos={resolvedPhotos}
      videos={videos}
      timeline={timeline}
      guestbook={guestbook}
    />
  )
}
