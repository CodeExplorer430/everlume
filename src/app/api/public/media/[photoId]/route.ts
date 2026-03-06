import { verifySignedMediaToken } from '@/lib/server/private-media'
import { createClient } from '@/lib/supabase/server'
import { canAccessPrivatePage } from '@/lib/server/page-access'
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

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('photos')
    .select('id, image_url, thumb_url, page_id, pages!inner(owner_id, privacy)')
    .eq('id', photoId)
    .single()

  if (!photo) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Photo not found.' }, { status: 404 })
  }

  const page = Array.isArray(photo.pages) ? photo.pages[0] : photo.pages
  if (!page || page.privacy !== 'private') {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'This endpoint only serves private media.' }, { status: 403 })
  }

  const access = await canAccessPrivatePage(page.owner_id)
  if (!access.allowed) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'You do not have access to this media.' }, { status: 403 })
  }

  const sourceUrl = variant === 'thumb' ? photo.thumb_url || photo.image_url : photo.image_url
  if (!sourceUrl) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Media URL is missing.' }, { status: 404 })
  }

  const upstream = await fetch(sourceUrl, { cache: 'no-store' })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ code: 'UPSTREAM_ERROR', message: 'Unable to load media.' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=60',
    },
  })
}
