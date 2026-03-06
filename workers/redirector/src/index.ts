interface Env {
  SUPABASE_URL: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  FALLBACK_URL?: string
}

type RedirectRow = {
  target_url: string
  is_active?: boolean
}

function notFoundResponse(): Response {
  return new Response('Short link not found', { status: 404 })
}

function sanitizeCode(pathname: string): string {
  return pathname.replace(/^\/+/, '').replace(/^r\//, '').trim()
}

async function fetchTargetUrl(code: string, env: Env): Promise<string | null> {
  const apiKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey) return null
  const endpoint = new URL(`${env.SUPABASE_URL}/rest/v1/redirects`)
  endpoint.searchParams.set('shortcode', `eq.${code}`)
  endpoint.searchParams.set('is_active', 'eq.true')
  endpoint.searchParams.set('select', 'target_url,is_active')
  endpoint.searchParams.set('limit', '1')

  const res = await fetch(endpoint.toString(), {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cf: {
      cacheTtl: 60,
      cacheEverything: true,
    },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } })

  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as RedirectRow[]
  const row = data[0]
  if (!row || row.is_active === false) {
    return null
  }
  return row.target_url
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    if (url.pathname === '/' || url.pathname === '') {
      if (env.FALLBACK_URL) {
        return Response.redirect(env.FALLBACK_URL, 302)
      }
      return notFoundResponse()
    }

    const code = sanitizeCode(url.pathname)
    if (!code) {
      return notFoundResponse()
    }

    const targetUrl = await fetchTargetUrl(code, env)
    if (!targetUrl) {
      return notFoundResponse()
    }

    return Response.redirect(targetUrl, 302)
  },
}

export default worker
