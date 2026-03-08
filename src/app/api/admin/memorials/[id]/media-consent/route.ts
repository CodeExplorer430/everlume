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
    .from('media_access_consents')
    .select('id, event_type, access_mode, consent_source, media_kind, media_variant, ip_hash, user_agent_hash, created_at')
    .eq('page_id', parsed.data.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return databaseError('Unable to load protected media consent records.')
  }

  return NextResponse.json({ logs: data ?? [] }, { status: 200 })
}
