import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(['admin', 'editor', 'viewer']),
})

async function assertAdminPrivileges() {
  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) {
    return { ok: false as const, response: auth.response }
  }

  return { ok: true as const, supabase: auth.supabase, userId: auth.userId }
}

export async function GET() {
  const authz = await assertAdminPrivileges()
  if (!authz.ok) return authz.response
  const { supabase } = authz

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, updated_at, invited_at, deactivated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return databaseError('Unable to load users.')
  }

  return NextResponse.json({ users: data ?? [] }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const authz = await assertAdminPrivileges()
  if (!authz.ok) return authz.response
  const { userId } = authz

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Enter a valid email, full name, and role.' },
      { status: 400 }
    )
  }

  let serviceRole
  try {
    serviceRole = createServiceRoleClient()
  } catch {
    return NextResponse.json(
      { code: 'CONFIG_ERROR', message: 'SUPABASE_SERVICE_ROLE_KEY is required for user invitations.' },
      { status: 500 }
    )
  }

  const { email, fullName, role } = parsed.data

  const { data: inviteData, error: inviteError } = await serviceRole.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name: fullName },
  })

  if (inviteError || !inviteData.user) {
    if (inviteError?.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ code: 'EMAIL_EXISTS', message: 'A user with this email already exists.' }, { status: 409 })
    }

    return databaseError('Unable to invite user right now.')
  }

  const { data: profileData, error: profileError } = await serviceRole
    .from('profiles')
    .upsert(
      {
        id: inviteData.user.id,
        full_name: fullName,
        role,
        is_active: true,
        invited_at: new Date().toISOString(),
        deactivated_at: null,
      },
      { onConflict: 'id' }
    )
    .select('id, full_name, role, is_active, created_at, updated_at, invited_at, deactivated_at')
    .single()

  if (profileError) {
    return databaseError('Unable to save invited user profile.')
  }

  await logAdminAudit(authz.supabase, {
    actorId: userId,
    action: 'user.create',
    entity: 'user',
    entityId: profileData.id,
    metadata: { role: profileData.role },
  })

  return NextResponse.json({ user: profileData }, { status: 201 })
}
