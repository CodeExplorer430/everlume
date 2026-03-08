import { assertMemorialOwnership, databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsMemorial = await assertMemorialOwnership(supabase, parsed.data.id, userId, role)
  if (!ownsMemorial) return forbidden('You do not have access to this memorial.')

  const { data, error } = await supabase
    .from('guestbook')
    .select('id, name, email, message, is_approved, created_at')
    .eq('page_id', parsed.data.id)
    .order('created_at', { ascending: false })

  if (error) {
    return databaseError('Unable to load guestbook entries.')
  }

  return NextResponse.json({ entries: data ?? [] }, { status: 200 })
}
