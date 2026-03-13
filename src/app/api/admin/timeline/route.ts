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

const timelineSchema = z
  .object({
    memorialId: z.string().uuid().optional(),
    pageId: z.string().uuid().optional(),
    year: z.number().int().min(1000).max(2100),
    text: z.string().trim().min(1).max(500),
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

  const parsed = timelineSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid year and timeline description.',
      },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const { year, text } = parsed.data
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
    .from('timeline_events')
    .insert({
      page_id: memorialId,
      year,
      text,
    })
    .select('id, year, text, page_id')
    .single()

  if (error) {
    return databaseError('Unable to add timeline event.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'timeline.create',
    entity: 'timeline',
    entityId: data.id,
    metadata: { memorialId: data.page_id },
  })

  return NextResponse.json({ event: data }, { status: 201 })
}
