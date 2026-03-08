import { databaseError, requireAdminUser } from '@/lib/server/admin-auth'
import { normalizeAdminAuditLog } from '@/lib/server/admin-audit'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdminUser({ minRole: 'admin' })
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('id, actor_id, action, entity, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return databaseError('Unable to load audit logs.')
  }

  return NextResponse.json({ logs: (data ?? []).map(normalizeAdminAuditLog) }, { status: 200 })
}
