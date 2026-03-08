import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

function getAuthRedirectTo(request: NextRequest) {
  return new URL('/auth/callback?next=/login/reset-password', request.url).toString()
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid user id.' }, { status: 400 })
  }

  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) return auth.response

  let serviceRole
  try {
    serviceRole = createServiceRoleClient()
  } catch {
    return NextResponse.json(
      { code: 'CONFIG_ERROR', message: 'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required for password resets.' },
      { status: 500 }
    )
  }

  const { data: existing, error: existingError } = await serviceRole
    .from('profiles')
    .select('id, email, role, is_active')
    .eq('id', parsedParams.data.id)
    .single()

  if (existingError || !existing?.email) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found.' }, { status: 404 })
  }

  const { error: resetError } = await serviceRole.auth.resetPasswordForEmail(existing.email, {
    redirectTo: getAuthRedirectTo(request),
  })

  if (resetError) {
    return databaseError('Unable to send password reset email.')
  }

  await logAdminAudit(auth.supabase, {
    actorId: auth.userId,
    action: 'user.password.reset',
    entity: 'user',
    entityId: parsedParams.data.id,
    metadata: { role: existing.role, isActive: existing.is_active },
  })

  return NextResponse.json({ ok: true, message: 'Password reset email sent.' }, { status: 200 })
}
