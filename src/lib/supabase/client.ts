import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKeyOrThrow, getSupabaseUrlOrThrow } from '@/lib/supabase/env'

export function createClient() {
  return createBrowserClient(getSupabaseUrlOrThrow(), getSupabasePublishableKeyOrThrow())
}
