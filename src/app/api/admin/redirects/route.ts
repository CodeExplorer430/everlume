import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const redirectSchema = z.object({
  shortcode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,32}$/),
  targetUrl: z.string().trim().url(),
})

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

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  let query = supabase
    .from('redirects')
    .select(
      'id, shortcode, target_url, print_status, last_verified_at, is_active, created_at'
    )
  if (role !== 'admin') {
    query = query.eq('created_by', userId)
  }
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    if (isSchemaMismatch(error)) {
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

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const redirects: RedirectPayload[] = rows.map((item) => ({
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

export async function POST(request: NextRequest) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const parsed = redirectSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid short code and URL.',
      },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId } = auth

  const { shortcode, targetUrl } = parsed.data
  const primaryInsert = await supabase
    .from('redirects')
    .insert({
      shortcode,
      target_url: targetUrl,
      print_status: 'unverified',
      last_verified_at: null,
      is_active: true,
      created_by: userId,
    })
    .select(
      'id, shortcode, target_url, print_status, last_verified_at, is_active, created_at'
    )
    .single()

  let insertData = primaryInsert.data as Record<string, unknown> | null
  let insertError = primaryInsert.error

  if (isSchemaMismatch(insertError)) {
    const fallback = await supabase
      .from('redirects')
      .insert({
        shortcode,
        target_url: targetUrl,
        created_by: userId,
      })
      .select('id, shortcode, target_url, created_at')
      .single()

    insertData = fallback.data as Record<string, unknown> | null
    insertError = fallback.error
  }

  if (insertError || !insertData) {
    if (isSchemaMismatch(insertError)) {
      return NextResponse.json(
        {
          code: 'SCHEMA_MISMATCH',
          message:
            'Database schema is outdated. Run the latest Supabase migrations.',
        },
        { status: 500 }
      )
    }
    if (insertError?.code === '23505') {
      return NextResponse.json(
        {
          code: 'SHORTCODE_EXISTS',
          message: 'This short code is already in use.',
        },
        { status: 409 }
      )
    }
    return databaseError('Unable to create redirect right now.')
  }

  const redirectPayload: RedirectPayload = {
    id: String(insertData.id),
    shortcode: String(insertData.shortcode),
    target_url: String(insertData.target_url),
    print_status:
      (insertData.print_status as 'unverified' | 'verified') ?? 'unverified',
    last_verified_at:
      typeof insertData.last_verified_at === 'string'
        ? insertData.last_verified_at
        : null,
    is_active: insertData.is_active !== false,
    created_at: String(insertData.created_at),
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'redirect.create',
    entity: 'redirect',
    entityId: redirectPayload.id,
    metadata: { shortcode: redirectPayload.shortcode },
  })

  return NextResponse.json({ redirect: redirectPayload }, { status: 201 })
}
