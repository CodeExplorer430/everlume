import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'viewer' })
  if (!auth.ok) return auth.response
  const { supabase, role, userId } = auth

  let query = supabase
    .from('media_access_consents')
    .select('id, page_id, event_type, access_mode, consent_source, consent_version, media_kind, media_variant, ip_hash, user_agent_hash, created_at, pages!inner(title, slug, owner_id)')

  if (role !== 'admin') {
    query = query.eq('pages.owner_id', userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(250)
  if (error) {
    return databaseError('Unable to load protected media consent report.')
  }

  const logs = (data ?? []).map((entry) => {
    const memorial = Array.isArray(entry.pages) ? entry.pages[0] : entry.pages
    return {
      id: entry.id,
      memorialId: entry.page_id,
      memorialTitle: memorial?.title || 'Untitled memorial',
      memorialSlug: memorial?.slug || '',
      eventType: entry.event_type,
      accessMode: entry.access_mode,
      consentSource: entry.consent_source,
      consentVersion: entry.consent_version,
      mediaKind: entry.media_kind,
      mediaVariant: entry.media_variant,
      ipHash: entry.ip_hash,
      userAgentHash: entry.user_agent_hash,
      createdAt: entry.created_at,
    }
  })

  return NextResponse.json(
    {
      logs,
      summary: {
        total: logs.length,
        consentGranted: logs.filter((entry) => entry.eventType === 'consent_granted').length,
        mediaAccessed: logs.filter((entry) => entry.eventType === 'media_accessed').length,
        memorials: new Set(logs.map((entry) => entry.memorialId)).size,
      },
    },
    { status: 200 }
  )
}
