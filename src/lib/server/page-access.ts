import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getPageAccessCookieName, verifyPageAccessToken } from '@/lib/server/page-password'

export async function canAccessPrivatePage(pageOwnerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false as const, userId: null }
  }

  if (user.id === pageOwnerId) {
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

type AccessMode = 'public' | 'private' | 'password'

type AccessPageRecord = {
  id: string
  owner_id: string
  access_mode?: AccessMode | null
  privacy?: 'public' | 'private' | null
  password_updated_at?: string | null
}

export async function canAccessMemorialPage(page: AccessPageRecord) {
  const accessMode: AccessMode = page.access_mode || (page.privacy === 'private' ? 'private' : 'public')
  if (accessMode === 'public') {
    return { allowed: true as const, requiresPassword: false as const }
  }

  const ownerAccess = await canAccessPrivatePage(page.owner_id)
  if (ownerAccess.allowed) {
    return { allowed: true as const, requiresPassword: accessMode === 'password' as const }
  }

  if (accessMode !== 'password') {
    return { allowed: false as const, requiresPassword: false as const }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(getPageAccessCookieName(page.id))?.value
  const valid = verifyPageAccessToken(token, page.id, page.password_updated_at || null)

  return { allowed: valid as boolean, requiresPassword: true as const }
}
