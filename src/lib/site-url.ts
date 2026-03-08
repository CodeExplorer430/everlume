function normalizeAppUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(withProtocol)
  } catch {
    return null
  }
}

export function getAppBaseUrl() {
  const explicit = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL || '')
  if (explicit) return explicit

  const production = normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
  if (production) return production

  const preview = normalizeAppUrl(process.env.VERCEL_URL || '')
  if (preview) return preview

  return new URL('http://localhost:3000')
}
