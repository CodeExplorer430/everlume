import { authenticateE2EUser, applyE2EAuthSession, clearE2EAuthSession, isE2EFakeAuthEnabled } from '@/lib/server/e2e-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  if (!isE2EFakeAuthEnabled()) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Not found.' }, { status: 404 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.' }, { status: 400 })
  }

  const result = authenticateE2EUser(parsed.data.email, parsed.data.password)
  if (!result.ok) {
    const response = NextResponse.json({ code: 'AUTH_ERROR', message: result.message }, { status: result.status })
    clearE2EAuthSession(response)
    return response
  }

  const response = NextResponse.json({ ok: true, user: result.session }, { status: 200 })
  applyE2EAuthSession(response, result.session)
  return response
}
