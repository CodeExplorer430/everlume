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
  const page = fixture?.page

  if (page) {
    if (resolveMemorialAccessMode(page) !== 'public') {
      const access = await canAccessMemorial(page)
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

  const page =
    fixture?.page ||
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

  if (!page) {
    notFound()
  }

  if (resolveMemorialAccessMode(page) !== 'public') {
    const access = await canAccessMemorial(page)
    if (!access.allowed && !access.requiresPassword) {
      notFound()
    }

    if (!access.allowed && access.requiresPassword) {
      return <PageUnlockForm slug={slug} />
    }
  }

  const photos =
    fixture?.photos ||
    (await supabase!.from('photos').select('*').eq('page_id', page.id).order('sort_index', { ascending: true })).data ||
    []

  const guestbook =
    fixture?.guestbook.filter((entry) => entry.is_approved) ||
    (
      await supabase!
        .from('guestbook')
        .select('*')
        .eq('page_id', page.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
    ).data ||
    []

  const timeline =
    fixture?.timeline ||
    (await supabase!.from('timeline_events').select('*').eq('page_id', page.id).order('year', { ascending: true })).data ||
    []

  const videos =
    fixture?.videos ||
    (await supabase!.from('videos').select('*').eq('page_id', page.id).order('created_at', { ascending: true })).data ||
    []

  const resolvedPhotos =
    memorialRequiresProtectedMedia(page)
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

  const resolvedPage = {
    ...page,
    memorial_slideshow_enabled:
      page.memorial_slideshow_enabled ?? (siteSettings?.memorial_slideshow_enabled !== false),
    memorial_slideshow_interval_ms: page.memorial_slideshow_interval_ms ?? (Number(siteSettings?.memorial_slideshow_interval_ms) || 4500),
    memorial_video_layout:
      page.memorial_video_layout ?? (siteSettings?.memorial_video_layout === 'featured' ? 'featured' : 'grid'),
  }

  return (
    <MemorialPageView
      page={resolvedPage}
      photos={resolvedPhotos}
      videos={videos}
      timeline={timeline}
      guestbook={guestbook}
    />
  )
}
