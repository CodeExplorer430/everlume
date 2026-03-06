import { createSignedMediaToken } from '@/lib/server/private-media'
import { createClient } from '@/lib/supabase/server'
import { canAccessPrivatePage } from '@/lib/server/page-access'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()

  const { data: page } = await supabase.from('pages').select('id, owner_id, privacy').eq('slug', slug).single()
  if (!page) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Memorial page not found.' }, { status: 404 })
  }

  if (page.privacy === 'private') {
    const access = await canAccessPrivatePage(page.owner_id)
    if (!access.allowed) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'This memorial is private.' }, { status: 403 })
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
    page.privacy === 'private'
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
