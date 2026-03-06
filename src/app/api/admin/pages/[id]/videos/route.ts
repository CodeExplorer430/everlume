import { assertPageOwnership, databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid page id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsPage = await assertPageOwnership(supabase, parsed.data.id, userId, role)
  if (!ownsPage) return forbidden('You do not have access to this page.')

  const { data, error } = await supabase
    .from('videos')
    .select('id, provider_id, title, created_at')
    .eq('page_id', parsed.data.id)
    .order('created_at', { ascending: true })

  if (error) {
    return databaseError('Unable to load videos.')
  }

  return NextResponse.json({ videos: data ?? [] }, { status: 200 })
}
