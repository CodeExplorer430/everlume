import {
  assertOwnedRowByPageId,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updatePhotoSchema = z.object({
  caption: z.string().trim().max(240),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid photo id.' },
      { status: 400 }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const parsedPayload = updatePhotoSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Caption is required.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const allowed = await assertOwnedRowByPageId(
    supabase,
    'photos',
    parsedParams.data.id,
    userId,
    role
  )
  if (!allowed) return forbidden('You do not have access to this photo.')

  const { error } = await supabase
    .from('photos')
    .update({
      caption: parsedPayload.data.caption,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsedParams.data.id)

  if (error) {
    return databaseError('Unable to update photo.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'photo.update',
    entity: 'photo',
    entityId: parsedParams.data.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid photo id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const allowed = await assertOwnedRowByPageId(
    supabase,
    'photos',
    parsedParams.data.id,
    userId,
    role
  )
  if (!allowed) return forbidden('You do not have access to this photo.')

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', parsedParams.data.id)
  if (error) {
    return databaseError('Unable to delete photo.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'photo.delete',
    entity: 'photo',
    entityId: parsedParams.data.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
