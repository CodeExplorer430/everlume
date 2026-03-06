import { assertOwnedRowByPageId, databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid video id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsRow = await assertOwnedRowByPageId(supabase, 'videos', parsed.data.id, userId, role)
  if (!ownsRow) return forbidden('You do not have access to this video.')

  const { error } = await supabase.from('videos').delete().eq('id', parsed.data.id)
  if (error) {
    return databaseError('Unable to delete video.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'video.delete',
    entity: 'video',
    entityId: parsed.data.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
