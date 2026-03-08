import { createClient } from '@/lib/supabase/server'
import { getE2ERedirectFixtureByCode, isE2EPublicFixturesEnabled } from '@/lib/server/e2e-public-fixtures'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalizedCode = code.trim().toLowerCase()
  const fallbackUrl = new URL('/r/not-found', request.url)
  fallbackUrl.searchParams.set('code', normalizedCode)

  if (!/^[a-z0-9-]{3,32}$/.test(normalizedCode)) {
    fallbackUrl.searchParams.set('reason', 'invalid')
    const response = NextResponse.redirect(fallbackUrl, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  if (isE2EPublicFixturesEnabled()) {
    const fixture = getE2ERedirectFixtureByCode(normalizedCode)

    if (!fixture) {
      fallbackUrl.searchParams.set('reason', 'missing')
      const response = NextResponse.redirect(fallbackUrl, 302)
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    if (fixture.is_active === false) {
      fallbackUrl.searchParams.set('reason', 'disabled')
      const response = NextResponse.redirect(fallbackUrl, 302)
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    const response = NextResponse.redirect(new URL(fixture.target_url, request.url), 302)
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60')
    return response
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('redirects')
    .select('target_url, is_active')
    .eq('shortcode', normalizedCode)
    .single()

  if (!data) {
    fallbackUrl.searchParams.set('reason', 'missing')
    const response = NextResponse.redirect(fallbackUrl, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  if (data.is_active === false) {
    fallbackUrl.searchParams.set('reason', 'disabled')
    const response = NextResponse.redirect(fallbackUrl, 302)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  const response = NextResponse.redirect(data.target_url, 302)
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60')
  return response
}
