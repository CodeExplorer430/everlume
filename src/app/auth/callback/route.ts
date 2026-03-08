import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_REDIRECT = '/admin'
const PASSWORD_REDIRECT = '/login/reset-password'

function sanitizeRedirect(next: string | null) {
  if (!next || !next.startsWith('/')) return DEFAULT_REDIRECT
  return next
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const next = sanitizeRedirect(url.searchParams.get('next'))
  const supabase = await createClient()

  let error: { message?: string } | null = null

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'invite' | 'recovery' | 'email_change' | 'magiclink' | 'signup',
    })
    error = result.error
  } else {
    error = { message: 'Missing auth token.' }
  }

  const redirectPath = error ? `/login?error=${encodeURIComponent(error.message || 'Unable to complete sign in.')}` : next

  return NextResponse.redirect(new URL(redirectPath, request.url))
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export { PASSWORD_REDIRECT }
