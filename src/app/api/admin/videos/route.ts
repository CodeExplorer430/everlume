import { assertMemorialOwnership, databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { resolveMemorialId } from '@/lib/server/memorials'
import { getYoutubeId } from '@/lib/server/youtube'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const videoSchema = z.object({
  memorialId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  url: z.string().trim().url(),
  title: z.string().trim().max(120).optional().default(''),
}).refine((value) => Boolean(resolveMemorialId(value)), {
  message: 'Memorial id is required.',
})

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = videoSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Enter a valid YouTube URL and optional title.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const { url, title } = parsed.data
  const memorialId = resolveMemorialId(parsed.data)
  if (!memorialId) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Memorial id is required.' }, { status: 400 })
  }
  const videoId = getYoutubeId(url)

  if (!videoId) {
    return NextResponse.json({ code: 'INVALID_VIDEO_URL', message: 'Invalid YouTube URL.' }, { status: 400 })
  }

  const ownsMemorial = await assertMemorialOwnership(supabase, memorialId, userId, role)
  if (!ownsMemorial) return forbidden('You do not have access to this memorial.')

  const { data, error } = await supabase
    .from('videos')
    .insert({
      page_id: memorialId,
      provider: 'youtube',
      provider_id: videoId,
      title: title || null,
    })
    .select('id, provider, provider_id, title, created_at')
    .single()

  if (error) {
    return databaseError('Unable to add video right now.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.create',
    entity: 'video',
    entityId: data.id,
    metadata: { memorialId, providerId: data.provider_id },
  })

  return NextResponse.json({ video: data }, { status: 201 })
}
