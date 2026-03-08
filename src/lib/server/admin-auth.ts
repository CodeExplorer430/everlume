import { createClient } from '@/lib/supabase/server'
import { getE2EAuthSession, isE2EFakeAuthEnabled } from '@/lib/server/e2e-auth'
import { toMemorialRecord } from '@/lib/server/memorials'
import { NextResponse } from 'next/server'

export type AdminSupabase = Awaited<ReturnType<typeof createClient>>
export type AdminRole = 'admin' | 'editor' | 'viewer'

const E2E_USER_ID = process.env.E2E_ADMIN_USER_ID || '00000000-0000-0000-0000-000000000001'
const E2E_ROLE = (process.env.E2E_ADMIN_ROLE as AdminRole | undefined) || 'admin'

const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}

type RequireAdminUserOptions = {
  minRole?: AdminRole
}

type ProfileAccess = {
  role: AdminRole
  isActive: boolean
}

async function getProfileAccess(supabase: AdminSupabase, userId: string): Promise<ProfileAccess | null> {
  const { data, error } = await supabase.from('profiles').select('role, is_active').eq('id', userId).single()

  if (!error && data?.role) {
    return { role: (data.role as AdminRole) || 'viewer', isActive: data.is_active !== false }
  }

  // Backward compatibility for older schemas that don't include is_active.
  const legacy = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (!legacy.error && legacy.data?.role) {
    return { role: (legacy.data.role as AdminRole) || 'viewer', isActive: true }
  }

  return null
}

export async function requireAdminUser(options: RequireAdminUserOptions = {}) {
  const minRole = options.minRole || 'viewer'
  const supabase = await createClient()

  if (isE2EFakeAuthEnabled()) {
    const session = await getE2EAuthSession()
    if (session) {
      if (!session.isActive) {
        return { ok: false as const, response: forbidden('Your account does not have admin access.') }
      }
      if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) {
        return { ok: false as const, response: forbidden('Insufficient permissions for this action.') }
      }

      return { ok: true as const, supabase, userId: session.userId, role: session.role }
    }
  }

  if (process.env.E2E_BYPASS_ADMIN_AUTH === '1') {
    if (ROLE_RANK[E2E_ROLE] < ROLE_RANK[minRole]) {
      return { ok: false as const, response: forbidden('Insufficient permissions for this action.') }
    }
    return { ok: true as const, supabase, userId: E2E_USER_ID, role: E2E_ROLE }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ code: 'UNAUTHORIZED', message: 'You must be signed in.' }, { status: 401 }),
    }
  }

  const profile = await getProfileAccess(supabase, user.id)
  if (!profile || !profile.isActive) {
    return { ok: false as const, response: forbidden('Your account does not have admin access.') }
  }

  if (ROLE_RANK[profile.role] < ROLE_RANK[minRole]) {
    return { ok: false as const, response: forbidden('Insufficient permissions for this action.') }
  }

  return { ok: true as const, supabase, userId: user.id, role: profile.role }
}

export function forbidden(message: string) {
  return NextResponse.json({ code: 'FORBIDDEN', message }, { status: 403 })
}

export function databaseError(message: string) {
  return NextResponse.json({ code: 'DATABASE_ERROR', message }, { status: 500 })
}

export async function assertMemorialOwnership(supabase: AdminSupabase, memorialId: string, userId: string, role: AdminRole = 'viewer') {
  let query = supabase.from('pages').select('id').eq('id', memorialId)
  if (role !== 'admin') {
    query = query.eq('owner_id', userId)
  }
  const { data: memorial } = await query.single()
  return Boolean(memorial)
}

export async function getOwnedMemorial(supabase: AdminSupabase, memorialId: string, userId: string, role: AdminRole = 'viewer') {
  let query = supabase
    .from('pages')
    .select(
      'id, title, slug, full_name, dob, dod, privacy, access_mode, hero_image_url, memorial_theme, memorial_slideshow_enabled, memorial_slideshow_interval_ms, memorial_video_layout, memorial_photo_fit, memorial_caption_style, qr_template, qr_caption, qr_foreground_color, qr_background_color, qr_frame_style, qr_caption_font, qr_show_logo'
    )
    .eq('id', memorialId)
  if (role !== 'admin') {
    query = query.eq('owner_id', userId)
  }
  const { data: memorial } = await query.single()
  return memorial ? toMemorialRecord(memorial) : null
}

export async function assertOwnedRowByMemorialId(
  supabase: AdminSupabase,
  table: 'guestbook' | 'timeline_events' | 'videos' | 'photos',
  rowId: string,
  userId: string,
  role: AdminRole = 'viewer'
) {
  const { data: row } = await supabase.from(table).select('id, page_id').eq('id', rowId).single()
  if (!row) return false

  return assertMemorialOwnership(supabase, row.page_id, userId, role)
}

export const assertPageOwnership = assertMemorialOwnership
export const getOwnedPage = getOwnedMemorial
export const assertOwnedRowByPageId = assertOwnedRowByMemorialId
