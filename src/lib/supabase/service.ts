import { createClient } from '@supabase/supabase-js'
import { getSupabaseSecretKeyOrThrow, getSupabaseUrlOrThrow } from '@/lib/supabase/env'

export function createServiceRoleClient() {
  const supabaseUrl = getSupabaseUrlOrThrow()
  const serviceRoleKey = getSupabaseSecretKeyOrThrow()

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
