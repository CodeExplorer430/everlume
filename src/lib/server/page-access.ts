import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getMemorialAccessCookieName, verifyMemorialAccessToken } from '@/lib/server/page-password'
import { resolveMemorialAccessMode, type MemorialAccessMode } from '@/lib/server/memorials'

export async function canAccessPrivateMemorial(memorialOwnerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false as const, userId: null }
  }

  if (user.id === memorialOwnerId) {
    return { allowed: true as const, userId: user.id }
  }

  const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single()
  if (!profile) {
    return { allowed: false as const, userId: user.id }
  }

  if (profile.is_active === false) {
    return { allowed: false as const, userId: user.id }
  }

  if (profile.role === 'admin' || profile.role === 'editor' || profile.role === 'viewer') {
    return { allowed: true as const, userId: user.id }
  }

  return { allowed: false as const, userId: user.id }
}

type AccessPageRecord = {
  id: string
  owner_id: string
  access_mode?: MemorialAccessMode | null
  privacy?: 'public' | 'private' | null
  password_updated_at?: string | null
}

export function memorialRequiresProtectedMedia(memorial: Pick<AccessPageRecord, 'access_mode' | 'privacy'>) {
  return resolveMemorialAccessMode(memorial) !== 'public'
}

export async function canAccessMemorial(memorial: AccessPageRecord) {
  const accessMode = resolveMemorialAccessMode(memorial)
  if (accessMode === 'public') {
    return { allowed: true as const, requiresPassword: false as const }
  }

  const ownerAccess = await canAccessPrivateMemorial(memorial.owner_id)
  if (ownerAccess.allowed) {
    return { allowed: true as const, requiresPassword: accessMode === 'password' as const }
  }

  if (accessMode !== 'password') {
    return { allowed: false as const, requiresPassword: false as const }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(getMemorialAccessCookieName(memorial.id))?.value
  const valid = verifyMemorialAccessToken(token, memorial.id, memorial.password_updated_at || null)

  return { allowed: valid as boolean, requiresPassword: true as const }
}

export const canAccessPrivatePage = canAccessPrivateMemorial
export { resolveMemorialAccessMode }
