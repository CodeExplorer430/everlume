import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getE2EAuthSessionFromRequest, isE2EFakeAuthEnabled } from '@/lib/server/e2e-auth'
import { getSupabasePublishableKeyOrThrow, getSupabaseUrlOrThrow } from '@/lib/supabase/env'

export async function updateSession(request: NextRequest) {
  if (process.env.E2E_BYPASS_ADMIN_AUTH === '1' && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next({ request })
  }

  if (isE2EFakeAuthEnabled() && request.nextUrl.pathname.startsWith('/admin')) {
    const session = getE2EAuthSessionFromRequest(request)
    if (!session?.isActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrlOrThrow(),
    getSupabasePublishableKeyOrThrow(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname.startsWith('/admin')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as is. If you're creating a
  // new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally: return myNewResponse

  return supabaseResponse
}
