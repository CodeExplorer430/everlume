import { createSignedMediaToken } from '@/lib/server/private-media'
import { createClient } from '@/lib/supabase/server'
import { canAccessMemorial, memorialRequiresProtectedMedia } from '@/lib/server/page-access'
import { getMemorialMediaConsentCookieName, verifyMemorialMediaConsentToken } from '@/lib/server/media-consent'
import { getE2EMemorialFixtureBySlug } from '@/lib/server/e2e-public-fixtures'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const fixture = getE2EMemorialFixtureBySlug(slug)

  if (fixture) {
    const access = await canAccessMemorial(fixture.memorial)
    if (!access.allowed) {
      if (access.requiresPassword) {
        return NextResponse.json({ code: 'FORBIDDEN', message: 'This memorial must be unlocked before media can be viewed.' }, { status: 403 })
      }

      return NextResponse.json({ code: 'FORBIDDEN', message: 'This memorial is private.' }, { status: 403 })
    }

    if (memorialRequiresProtectedMedia(fixture.memorial)) {
      const consentToken = request.cookies.get(getMemorialMediaConsentCookieName(fixture.memorial.id))?.value
      if (
        !verifyMemorialMediaConsentToken(
          consentToken,
          fixture.memorial.id,
          fixture.memorial.password_updated_at || null,
          fixture.siteSettings?.protected_media_consent_version || 1,
          fixture.memorial.media_consent_revoked_at || null
        )
      ) {
        return NextResponse.json({ code: 'CONSENT_REQUIRED', message: 'Confirm the protected media notice before viewing photos.' }, { status: 403 })
      }
    }

    const resolvedPhotos =
      memorialRequiresProtectedMedia(fixture.memorial)
        ? fixture.photos.map((photo) => {
            const imageToken = createSignedMediaToken(photo.id, 'image')
            const thumbToken = createSignedMediaToken(photo.id, 'thumb')
            return {
              id: photo.id,
              caption: photo.caption,
              image_url: `/api/public/media/${photo.id}?variant=image&token=${encodeURIComponent(imageToken)}`,
              thumb_url: `/api/public/media/${photo.id}?variant=thumb&token=${encodeURIComponent(thumbToken)}`,
            }
          })
        : fixture.photos.map((photo) => ({
            id: photo.id,
            caption: photo.caption,
            image_url: photo.image_url,
            thumb_url: photo.thumb_url,
          }))

    return NextResponse.json({ photos: resolvedPhotos }, { status: 200 })
  }

  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('id, owner_id, privacy, access_mode, password_updated_at, media_consent_revoked_at')
    .eq('slug', slug)
    .single()
  if (!page) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Memorial not found.' }, { status: 404 })
  }

  const access = await canAccessMemorial(page)
  if (!access.allowed) {
    if (access.requiresPassword) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'This memorial must be unlocked before media can be viewed.' }, { status: 403 })
    }

    return NextResponse.json({ code: 'FORBIDDEN', message: 'This memorial is private.' }, { status: 403 })
  }

  if (memorialRequiresProtectedMedia(page)) {
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('protected_media_consent_version')
      .eq('id', 1)
      .single()
    const consentToken = request.cookies.get(getMemorialMediaConsentCookieName(page.id))?.value
    if (
      !verifyMemorialMediaConsentToken(
        consentToken,
        page.id,
        page.password_updated_at || null,
        Number(siteSettings?.protected_media_consent_version) || 1,
        page.media_consent_revoked_at || null
      )
    ) {
      return NextResponse.json({ code: 'CONSENT_REQUIRED', message: 'Confirm the protected media notice before viewing photos.' }, { status: 403 })
    }
  }

  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, caption, image_url, thumb_url')
    .eq('page_id', page.id)
    .order('sort_index', { ascending: true })

  if (error) {
    return NextResponse.json({ code: 'DATABASE_ERROR', message: 'Unable to load media.' }, { status: 500 })
  }

  const resolvedPhotos =
    memorialRequiresProtectedMedia(page)
      ? (photos ?? []).map((photo) => {
          const imageToken = createSignedMediaToken(photo.id, 'image')
          const thumbToken = createSignedMediaToken(photo.id, 'thumb')
          return {
            id: photo.id,
            caption: photo.caption,
            image_url: `/api/public/media/${photo.id}?variant=image&token=${encodeURIComponent(imageToken)}`,
            thumb_url: `/api/public/media/${photo.id}?variant=thumb&token=${encodeURIComponent(thumbToken)}`,
          }
        })
      : (photos ?? []).map((photo) => ({
          id: photo.id,
          caption: photo.caption,
          image_url: photo.image_url,
          thumb_url: photo.thumb_url,
        }))

  return NextResponse.json({ photos: resolvedPhotos }, { status: 200 })
}
