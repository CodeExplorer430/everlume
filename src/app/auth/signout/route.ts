import { createClient } from '@/lib/supabase/server'
import { clearE2EAuthSession, getE2EAuthSession, isE2EFakeAuthEnabled } from '@/lib/server/e2e-auth'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (isE2EFakeAuthEnabled()) {
    const session = await getE2EAuthSession()
    const response = NextResponse.redirect(new URL('/login', req.url), {
      status: 302,
    })
    if (session) {
      clearE2EAuthSession(response)
    }
    revalidatePath('/', 'layout')
    return response
  }

  const supabase = await createClient()

  // Check if a user's session exists
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', req.url), {
    status: 302,
  })
}
