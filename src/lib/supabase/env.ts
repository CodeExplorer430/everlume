export function getSupabaseUrlOrThrow() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (value && value.trim() !== '') return value
  throw new Error('[supabase:url] Missing one of: NEXT_PUBLIC_SUPABASE_URL')
}

export function getSupabasePublishableKeyOrThrow() {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (publishable && publishable.trim() !== '') return publishable

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (anon && anon.trim() !== '') return anon

  throw new Error(
    '[supabase:publishable-key] Missing one of: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export function getSupabaseSecretKeyOrThrow() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (secret && secret.trim() !== '') return secret

  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (legacy && legacy.trim() !== '') return legacy

  throw new Error(
    '[supabase:secret-key] Missing one of: SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY'
  )
}
