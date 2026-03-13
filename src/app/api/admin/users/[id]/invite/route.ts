import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

function getAuthRedirectTo(request: NextRequest) {
  return new URL(
    '/auth/callback?next=/login/reset-password',
    request.url
  ).toString()
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid user id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) return auth.response

  let serviceRole
  try {
    serviceRole = createServiceRoleClient()
  } catch {
    return NextResponse.json(
      {
        code: 'CONFIG_ERROR',
        message:
          'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required for user invitations.',
      },
      { status: 500 }
    )
  }

  const { data: existing, error: existingError } = await serviceRole
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', parsedParams.data.id)
    .single()

  if (existingError || !existing?.email) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'User not found.' },
      { status: 404 }
    )
  }

  const { error: inviteError } = await serviceRole.auth.admin.inviteUserByEmail(
    existing.email,
    {
      data: { role: existing.role, full_name: existing.full_name },
      redirectTo: getAuthRedirectTo(request),
    }
  )

  if (inviteError) {
    return databaseError('Unable to resend invite right now.')
  }

  const { data: updated, error: updateError } = await serviceRole
    .from('profiles')
    .update({
      invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsedParams.data.id)
    .select(
      'id, email, full_name, role, is_active, created_at, updated_at, invited_at, deactivated_at'
    )
    .single()

  if (updateError) {
    return databaseError('Unable to update invite status.')
  }

  await logAdminAudit(auth.supabase, {
    actorId: auth.userId,
    action: 'user.invite.resend',
    entity: 'user',
    entityId: parsedParams.data.id,
    metadata: { role: existing.role },
  })

  return NextResponse.json(
    {
      user: { ...updated, account_state: 'invited' },
      message: 'Invite email sent.',
    },
    { status: 200 }
  )
}
