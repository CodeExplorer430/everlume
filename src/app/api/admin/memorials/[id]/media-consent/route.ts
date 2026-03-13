import {
  assertMemorialOwnership,
  databaseError,
  forbidden,
  requireAdminUser,
} from '@/lib/server/admin-auth'
import { logAdminAudit } from '@/lib/server/admin-audit'
import { validateAdminMutationOrigin } from '@/lib/security/request-origin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsMemorial = await assertMemorialOwnership(
    supabase,
    parsed.data.id,
    userId,
    role
  )
  if (!ownsMemorial)
    return forbidden('You do not have access to this memorial.')

  const [{ data: memorial }, { data: siteSettings }] = await Promise.all([
    supabase
      .from('pages')
      .select('id, title, media_consent_revoked_at')
      .eq('id', parsed.data.id)
      .single(),
    supabase
      .from('site_settings')
      .select('protected_media_consent_version')
      .eq('id', 1)
      .single(),
  ])

  const { data, error } = await supabase
    .from('media_access_consents')
    .select(
      'id, event_type, access_mode, consent_source, consent_version, media_kind, media_variant, ip_hash, user_agent_hash, created_at'
    )
    .eq('page_id', parsed.data.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return databaseError('Unable to load protected media consent records.')
  }

  return NextResponse.json(
    {
      logs: data ?? [],
      memorial: {
        id: parsed.data.id,
        title: memorial?.title || 'Untitled memorial',
        mediaConsentRevokedAt: memorial?.media_consent_revoked_at || null,
      },
      consentNoticeVersion:
        Number(siteSettings?.protected_media_consent_version) || 1,
    },
    { status: 200 }
  )
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = validateAdminMutationOrigin(request)
  if (originError) return originError

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid memorial id.' },
      { status: 400 }
    )
  }

  const auth = await requireAdminUser({ minRole: 'editor' })
  if (!auth.ok) return auth.response
  const { supabase, userId, role } = auth

  const ownsMemorial = await assertMemorialOwnership(
    supabase,
    parsed.data.id,
    userId,
    role
  )
  if (!ownsMemorial)
    return forbidden('You do not have access to this memorial.')

  const revokedAt = new Date().toISOString()
  const { error } = await supabase
    .from('pages')
    .update({ media_consent_revoked_at: revokedAt, updated_at: revokedAt })
    .eq('id', parsed.data.id)

  if (error) {
    return databaseError('Unable to revoke protected media consent.')
  }

  await logAdminAudit(supabase, {
    actorId: userId,
    action: 'media_consent.revoke',
    entity: 'memorial',
    entityId: parsed.data.id,
    metadata: { revokedAt },
  })

  return NextResponse.json({ ok: true, revokedAt }, { status: 200 })
}
