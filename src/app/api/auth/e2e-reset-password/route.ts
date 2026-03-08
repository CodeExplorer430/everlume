import { completeE2EPasswordReset, isE2EFakeAuthEnabled, requestE2EPasswordReset } from '@/lib/server/e2e-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  action: z.literal('request'),
  email: z.string().trim().email(),
})

const completeSchema = z.object({
  action: z.literal('complete'),
  email: z.string().trim().email(),
  password: z.string().min(8),
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

  const requestPayload = requestSchema.safeParse(payload)
  if (requestPayload.success) {
    const result = requestE2EPasswordReset(requestPayload.data.email)
    return NextResponse.json(
      {
        ok: true,
        message: 'Password reset instructions have been sent if the account exists.',
        resetPath: result.resetPath,
      },
      { status: 200 }
    )
  }

  const completePayload = completeSchema.safeParse(payload)
  if (!completePayload.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid password reset payload.' }, { status: 400 })
  }

  const result = completeE2EPasswordReset(completePayload.data.email, completePayload.data.password)
  if (!result.ok) {
    return NextResponse.json({ code: 'RESET_ERROR', message: result.message }, { status: result.status })
  }

  return NextResponse.json({ ok: true, message: 'Password updated.' }, { status: 200 })
}
