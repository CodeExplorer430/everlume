import {
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateSchema = z
  .object({
    printStatus: z.enum(['unverified', 'verified']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => value.printStatus !== undefined || value.isActive !== undefined,
    {
      message: 'No redirect updates were provided.',
    }
  )

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid redirect id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  let redirectQuery = supabase
    .from('redirects')
    .select('id, created_by')
    .eq('id', parsed.data.id)
  if (role !== 'admin') {
    redirectQuery = redirectQuery.eq('created_by', userId)
  }
  const { data: redirect } = await redirectQuery.single()

  if (!redirect) return forbidden('You do not have access to this redirect.')

  const { error } = await supabase
    .from('redirects')
    .delete()
    .eq('id', parsed.data.id)
  if (error) {
    return databaseError('Unable to delete redirect.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'redirect.delete',
    entity: 'redirect',
    entityId: parsed.data.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid redirect id.' },
      { status: 400 }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const parsedBody = updateSchema.safeParse(payload)
  if (!parsedBody.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Provide a valid redirect update.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  let ownershipQuery = supabase
    .from('redirects')
    .select('id, created_by')
    .eq('id', parsedParams.data.id)
  if (role !== 'admin') {
    ownershipQuery = ownershipQuery.eq('created_by', userId)
  }
  const { data: redirect } = await ownershipQuery.single()

  if (!redirect) return forbidden('You do not have access to this redirect.')

  const updates: Record<string, unknown> = {}
  if (parsedBody.data.printStatus !== undefined) {
    updates.print_status = parsedBody.data.printStatus
    updates.last_verified_at =
      parsedBody.data.printStatus === 'verified'
        ? new Date().toISOString()
        : null
  }
  if (parsedBody.data.isActive !== undefined) {
    updates.is_active = parsedBody.data.isActive
  }

  const { data, error } = await supabase
    .from('redirects')
    .update(updates)
    .eq('id', parsedParams.data.id)
    .select(
      'id, shortcode, target_url, print_status, last_verified_at, is_active, created_at'
    )
    .single()

  if (error) {
    return databaseError('Unable to update redirect.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'redirect.update',
    entity: 'redirect',
    entityId: parsedParams.data.id,
    metadata: {
      printStatus: data.print_status,
      isActive: data.is_active,
    },
  })

  return NextResponse.json({ redirect: data }, { status: 200 })
}
