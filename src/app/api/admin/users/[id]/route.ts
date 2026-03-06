import { AdminSupabase, databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const patchSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
})

async function assertAdminPrivileges() {
  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) {
    return { ok: false as const, response: auth.response }
  }

  return { ok: true as const, supabase: auth.supabase, userId: auth.userId }
}

async function countActiveAdmins(supabase: AdminSupabase) {
  const { count } = await supabase
    .from('profiles')
    .select('id', { head: true, count: 'exact' })
    .eq('role', 'admin')
    .eq('is_active', true)

  return count ?? 0
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid user id.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request payload.' }, { status: 400 })
  }

  const parsedBody = patchSchema.safeParse(payload)
  if (!parsedBody.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid user update payload.' }, { status: 400 })
  }

  const authz = await assertAdminPrivileges()
  if (!authz.ok) return authz.response
  const { supabase, userId } = authz

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', parsedParams.data.id)
    .single()

  if (existingError || !existing) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found.' }, { status: 404 })
  }

  const changes = parsedBody.data
  const willDeactivate = changes.isActive === false
  const willDowngradeAdmin = existing.role === 'admin' && changes.role && changes.role !== 'admin'

  if ((willDeactivate || willDowngradeAdmin) && existing.is_active) {
    const activeAdmins = await countActiveAdmins(supabase)
    const affectsActiveAdmin = existing.role === 'admin'

    if (affectsActiveAdmin && activeAdmins <= 1) {
      return NextResponse.json(
        { code: 'LAST_ADMIN', message: 'At least one active admin must remain.' },
        { status: 409 }
      )
    }
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof changes.fullName === 'string') updatePayload.full_name = changes.fullName
  if (typeof changes.role === 'string') updatePayload.role = changes.role
  if (typeof changes.isActive === 'boolean') {
    updatePayload.is_active = changes.isActive
    updatePayload.deactivated_at = changes.isActive ? null : new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', parsedParams.data.id)
    .select('id, full_name, role, is_active, created_at, updated_at, invited_at, deactivated_at')
    .single()

  if (error) {
    return databaseError('Unable to update user.')
  }

  const shouldSignOutSelf = parsedParams.data.id === userId && changes.isActive === false

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'user.update',
    entity: 'user',
    entityId: parsedParams.data.id,
    metadata: {
      fields: Object.keys(changes),
      selfAction: shouldSignOutSelf,
    },
  })

  return NextResponse.json({ user: data, shouldSignOutSelf }, { status: 200 })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid user id.' }, { status: 400 })
  }

  const authz = await assertAdminPrivileges()
  if (!authz.ok) return authz.response
  const { supabase, userId } = authz

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', parsedParams.data.id)
    .single()

  if (existingError || !existing) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found.' }, { status: 404 })
  }

  if (existing.role === 'admin' && existing.is_active) {
    const activeAdmins = await countActiveAdmins(supabase)
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { code: 'LAST_ADMIN', message: 'At least one active admin must remain.' },
        { status: 409 }
      )
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', parsedParams.data.id)

  if (error) {
    return databaseError('Unable to deactivate user.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'user.deactivate',
    entity: 'user',
    entityId: parsedParams.data.id,
    metadata: { selfAction: parsedParams.data.id === userId },
  })

  return NextResponse.json({ ok: true, shouldSignOutSelf: parsedParams.data.id === userId }, { status: 200 })
}
