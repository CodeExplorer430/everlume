import { verifySignedMediaToken } from '@/lib/server/private-media'
import { createClient } from '@/lib/supabase/server'
import { canAccessMemorial, memorialRequiresProtectedMedia } from '@/lib/server/page-access'
import { getMemorialMediaConsentCookieName, tryInsertMemorialMediaAccess, verifyMemorialMediaConsentToken } from '@/lib/server/media-consent'
import { getE2EPhotoFixtureById } from '@/lib/server/e2e-public-fixtures'
import { resolveMemorialAccessMode } from '@/lib/server/memorials'
import { NextRequest, NextResponse } from 'next/server'

type Variant = 'image' | 'thumb'

function parseVariant(value: string | null): Variant {
  return value === 'thumb' ? 'thumb' : 'image'
}

export async function GET(request: NextRequest, context: { params: Promise<{ photoId: string }> }) {
  const params = await context.params
  const photoId = params.photoId
  const variant = parseVariant(request.nextUrl.searchParams.get('variant'))
  const token = request.nextUrl.searchParams.get('token')

  if (!verifySignedMediaToken(token, photoId, variant)) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Invalid or expired media token.' }, { status: 403 })
  }

  const fixture = getE2EPhotoFixtureById(photoId)
  if (fixture) {
    if (!memorialRequiresProtectedMedia(fixture.memorial)) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'This endpoint only serves non-public memorial media.' }, { status: 403 })
    }

    const access = await canAccessMemorial(fixture.memorial)
    if (!access.allowed) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'You do not have access to this media.' }, { status: 403 })
    }

    const consentToken = request.cookies.get(getMemorialMediaConsentCookieName(fixture.memorial.id))?.value
    if (!verifyMemorialMediaConsentToken(consentToken, fixture.memorial.id, fixture.memorial.password_updated_at || null)) {
      return NextResponse.json({ code: 'CONSENT_REQUIRED', message: 'Confirm the protected media notice before viewing photos.' }, { status: 403 })
    }

    const sourceUrl = variant === 'thumb' ? fixture.photo.thumb_url || fixture.photo.image_url : fixture.photo.image_url
    if (!sourceUrl) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Media URL is missing.' }, { status: 404 })
    }

    const response = NextResponse.redirect(new URL(sourceUrl, request.url), 307)
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=60')
    return response
  }

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('photos')
    .select('id, image_url, thumb_url, page_id, pages!inner(id, owner_id, privacy, access_mode, password_updated_at)')
    .eq('id', photoId)
    .single()

  if (!photo) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Photo not found.' }, { status: 404 })
  }

  const page = Array.isArray(photo.pages) ? photo.pages[0] : photo.pages
  if (!page || !memorialRequiresProtectedMedia(page)) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'This endpoint only serves non-public memorial media.' }, { status: 403 })
  }

  const access = await canAccessMemorial(page)
  if (!access.allowed) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'You do not have access to this media.' }, { status: 403 })
  }

  const consentToken = request.cookies.get(getMemorialMediaConsentCookieName(page.id))?.value
  if (!verifyMemorialMediaConsentToken(consentToken, page.id, page.password_updated_at || null)) {
    return NextResponse.json({ code: 'CONSENT_REQUIRED', message: 'Confirm the protected media notice before viewing photos.' }, { status: 403 })
  }

  const sourceUrl = variant === 'thumb' ? photo.thumb_url || photo.image_url : photo.image_url
  if (!sourceUrl) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Media URL is missing.' }, { status: 404 })
  }

  const upstream = await fetch(sourceUrl, { cache: 'no-store' })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ code: 'UPSTREAM_ERROR', message: 'Unable to load media.' }, { status: 502 })
  }

  await tryInsertMemorialMediaAccess({
    request,
    memorialId: page.id,
    photoId: photo.id,
    accessMode: resolveMemorialAccessMode(page),
    eventType: 'media_accessed',
    mediaKind: variant === 'thumb' ? 'gallery_thumb' : 'gallery_image',
    mediaVariant: variant,
  })

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=60',
    },
  })
}
