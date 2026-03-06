import { databaseError, forbidden, requireAdminUser } from '@/lib/server/admin-auth'
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

  let pageQuery = supabase.from('pages').select('id, slug').eq('id', parsed.data.id)
  if (role !== 'admin') {
    pageQuery = pageQuery.eq('owner_id', userId)
  }
  const { data: page } = await pageQuery.single()

  if (!page) return forbidden('You do not have access to this page.')

  let redirectsQuery = supabase
    .from('redirects')
    .select('id, shortcode, target_url, print_status, last_verified_at, is_active, created_at')
  if (typeof redirectsQuery.ilike === 'function') {
    redirectsQuery = redirectsQuery.ilike('target_url', `%${page.slug}%`)
  }

  if (role !== 'admin') {
    redirectsQuery = redirectsQuery.eq('created_by', userId)
  }

  if (typeof redirectsQuery.order === 'function') {
    redirectsQuery = redirectsQuery.order('created_at', { ascending: false })
  }

  const { data, error } = await redirectsQuery

  if (error) {
    return databaseError('Unable to load redirects.')
  }

  return NextResponse.json({ redirects: data ?? [] }, { status: 200 })
}
