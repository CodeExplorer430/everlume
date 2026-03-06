import { createClient } from '@supabase/supabase-js'

function serviceEnvOrThrow(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for admin user management.`)
  }
  return value
}

export function createServiceRoleClient() {
  const supabaseUrl = serviceEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = serviceEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
