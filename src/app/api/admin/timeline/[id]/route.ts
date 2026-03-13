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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid timeline event id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsRow = await assertOwnedRowByPageId(
    supabase,
    'timeline_events',
    parsed.data.id,
    userId,
    role
  )
  if (!ownsRow) return forbidden('You do not have access to this event.')

  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('id', parsed.data.id)
  if (error) {
    return databaseError('Unable to delete timeline event.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'timeline.delete',
    entity: 'timeline',
    entityId: parsed.data.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
