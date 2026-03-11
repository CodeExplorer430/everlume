import {
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().uuid() })

function isSchemaMismatch(error: { code?: string } | null) {
  return error?.code === '42703' || error?.code === '42P01'
}

type RedirectPayload = {
  id: string
  shortcode: string
  target_url: string
  print_status: 'unverified' | 'verified'
  last_verified_at: string | null
  is_active: boolean
  created_at: string
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  let pageQuery = supabase
    .from('pages')
    .select('id, slug')
    .eq('id', parsed.data.id)
  if (role !== 'admin') {
    pageQuery = pageQuery.eq('owner_id', userId)
  }
  const { data: page } = await pageQuery.single()

  if (!page) return forbidden('You do not have access to this memorial.')

  let redirectsQuery = supabase
    .from('redirects')
    .select(
      'id, shortcode, target_url, print_status, last_verified_at, is_active, created_at'
    )
  if (typeof redirectsQuery.ilike === 'function') {
    redirectsQuery = redirectsQuery.ilike('target_url', `%${page.slug}%`)
  }

  if (role !== 'admin') {
    redirectsQuery = redirectsQuery.eq('created_by', userId)
  }

  if (typeof redirectsQuery.order === 'function') {
    redirectsQuery = redirectsQuery.order('created_at', { ascending: false })
  }

  const primaryResult = await redirectsQuery
  let resultData = primaryResult.data as Array<Record<string, unknown>> | null
  let resultError = primaryResult.error

  if (isSchemaMismatch(resultError)) {
    let fallbackQuery = supabase
      .from('redirects')
      .select('id, shortcode, target_url, created_at')
    if (typeof fallbackQuery.ilike === 'function') {
      fallbackQuery = fallbackQuery.ilike('target_url', `%${page.slug}%`)
    }
    if (role !== 'admin') {
      fallbackQuery = fallbackQuery.eq('created_by', userId)
    }
    if (typeof fallbackQuery.order === 'function') {
      fallbackQuery = fallbackQuery.order('created_at', { ascending: false })
    }
    const fallback = await fallbackQuery
    resultData = fallback.data as Array<Record<string, unknown>> | null
    resultError = fallback.error
  }

  if (resultError) {
    if (isSchemaMismatch(resultError)) {
      return NextResponse.json(
        {
          code: 'SCHEMA_MISMATCH',
          message:
            'Database schema is outdated. Run the latest Supabase migrations.',
        },
        { status: 500 }
      )
    }
    return databaseError('Unable to load redirects.')
  }

  const redirects: RedirectPayload[] = (resultData ?? []).map((item) => ({
    id: String(item.id),
    shortcode: String(item.shortcode),
    target_url: String(item.target_url),
    print_status:
      (item.print_status as 'unverified' | 'verified') ?? 'unverified',
    last_verified_at:
      typeof item.last_verified_at === 'string' ? item.last_verified_at : null,
    is_active: item.is_active !== false,
    created_at: String(item.created_at),
  }))

  return NextResponse.json({ redirects }, { status: 200 })
}
