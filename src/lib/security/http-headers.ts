type HeaderValue = {
  key: string
  value: string
}

type EnvSource = Record<string, string | undefined>

function normalizeOrigin(value: string | undefined) {
  if (!value) return null

  try {
    const parsed = new URL(value)
    return parsed.origin
  } catch {
    return null
  }
}

function collectEnvOrigins(env: EnvSource) {
  return [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SHORT_DOMAIN,
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.VIDEO_TRANSCODE_API_BASE,
    env.VIDEO_TRANSCODE_APP_BASE,
  ]
    .map(normalizeOrigin)
    .filter((value, index, array): value is string => {
      return Boolean(value) && array.indexOf(value) === index
    })
}

export function buildContentSecurityPolicy(env: EnvSource = process.env) {
  const isProduction =
    env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
  const appOrigins = collectEnvOrigins(env)
  const devConnectSources = isProduction
    ? []
    : [
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4173',
        'http://localhost:3000',
        'http://localhost:4173',
        'ws:',
      ]
  const connectSources = [
    "'self'",
    ...appOrigins,
    ...devConnectSources,
    'https://*.supabase.co',
    'https://api.cloudinary.com',
    'https://res.cloudinary.com',
    'https://challenges.cloudflare.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
  ]

  const imageSources = [
    "'self'",
    'data:',
    'blob:',
    ...appOrigins,
    'https://*.supabase.co',
    'https://res.cloudinary.com',
    'https://i.ytimg.com',
    'https://img.youtube.com',
  ]

  const frameSources = [
    "'self'",
    'https://challenges.cloudflare.com',
    'https://widget.cloudinary.com',
    'https://upload-widget.cloudinary.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
  ]

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        "'unsafe-inline'",
        ...(isProduction ? [] : ["'unsafe-eval'"]),
        'https://challenges.cloudflare.com',
        'https://widget.cloudinary.com',
        'https://upload-widget.cloudinary.com',
        'https://www.youtube.com',
        'https://www.youtube-nocookie.com',
      ],
    ],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', imageSources],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', connectSources],
    ['frame-src', frameSources],
    ['media-src', ["'self'", 'blob:', 'https://res.cloudinary.com']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ]

  return directives
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ')
}

export function getSecurityHeaders(
  env: EnvSource = process.env
): HeaderValue[] {
  return [
    {
      key: 'Content-Security-Policy',
      value: buildContentSecurityPolicy(env),
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
  ]
}
