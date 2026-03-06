import { createClient } from '@/lib/supabase/server'
import { createPageAccessToken, getPageAccessCookieMaxAge, getPageAccessCookieName, verifyPagePassword } from '@/lib/server/page-password'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ slug: z.string().trim().min(1) })
const payloadSchema = z.object({ password: z.string().min(1).max(128) })

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid page slug.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsedPayload = payloadSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Enter your access password.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: page } = await supabase
    .from('pages')
    .select('id, slug, access_mode, password_hash, password_updated_at')
    .eq('slug', parsedParams.data.slug)
    .single()

  if (!page || page.access_mode !== 'password') {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'This memorial is not available for password unlock.' }, { status: 404 })
  }

  const passwordValid = verifyPagePassword(parsedPayload.data.password, page.password_hash)
  if (!passwordValid) {
    return NextResponse.json({ code: 'INVALID_PASSWORD', message: 'The password is incorrect.' }, { status: 401 })
  }

  const token = createPageAccessToken(page.id, page.password_updated_at || null)
  const response = NextResponse.json({ ok: true }, { status: 200 })

  response.cookies.set(getPageAccessCookieName(page.id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/memorials',
    maxAge: getPageAccessCookieMaxAge(),
  })

  return response
}
