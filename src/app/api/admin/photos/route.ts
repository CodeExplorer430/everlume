import {
  assertMemorialOwnership,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { resolveMemorialId } from '@/lib/server/memorials'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createPhotoSchema = z
  .object({
    memorialId: z.string().uuid().optional(),
    pageId: z.string().uuid().optional(),
    caption: z.string().trim().max(240).optional().default(''),
    cloudinaryPublicId: z.string().trim().min(1).max(255),
    imageUrl: z.string().trim().url(),
    thumbUrl: z.string().trim().url().nullable().optional(),
    bytes: z.number().int().positive().nullable().optional(),
    format: z.string().trim().max(20).nullable().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Boolean(resolveMemorialId(value)), {
    message: 'Memorial id is required.',
  })

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const parsed = createPhotoSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid photo metadata.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const {
    caption,
    cloudinaryPublicId,
    imageUrl,
    thumbUrl,
    bytes,
    format,
    width,
    height,
  } = parsed.data
  const memorialId = resolveMemorialId(parsed.data)!
  const ownsMemorial = await assertMemorialOwnership(
    supabase,
    memorialId,
    userId,
    role
  )
  if (!ownsMemorial)
    return forbidden('You do not have access to this memorial.')

  const { data, error } = await supabase
    .from('photos')
    .insert({
      page_id: memorialId,
      caption,
      cloudinary_public_id: cloudinaryPublicId,
      image_url: imageUrl,
      thumb_url: thumbUrl ?? null,
      bytes: bytes ?? null,
      format: format ?? null,
      width: width ?? null,
      height: height ?? null,
    })
    .select(
      'id, caption, image_url, thumb_url, cloudinary_public_id, created_at'
    )
    .single()

  if (error) {
    return databaseError('Unable to save photo metadata.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'photo.create',
    entity: 'photo',
    entityId: data.id,
    metadata: { memorialId, cloudinaryPublicId },
  })

  return NextResponse.json({ photo: data }, { status: 201 })
}
