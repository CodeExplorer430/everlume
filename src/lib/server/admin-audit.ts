import { AdminSupabase } from '@/lib/server/admin-auth'

type AuditAction =
  | 'memorial.create'
  | 'memorial.update'
  | 'photo.create'
  | 'photo.update'
  | 'photo.delete'
  | 'video.create'
  | 'video.delete'
  | 'video.upload_init'
  | 'video.upload_start'
  | 'video.upload_attach'
  | 'timeline.create'
  | 'timeline.delete'
  | 'guestbook.approve'
  | 'guestbook.unapprove'
  | 'guestbook.delete'
  | 'redirect.create'
  | 'redirect.update'
  | 'redirect.delete'
  | 'user.create'
  | 'user.update'
  | 'user.deactivate'
  | 'user.invite.resend'
  | 'user.password.reset'
  | 'site_settings.update'

type LegacyAuditAction = 'page.create' | 'page.update'
type AuditLogAction = AuditAction | LegacyAuditAction

type LogAdminAuditInput = {
  actorId: string
  action: AuditAction
  entity: 'memorial' | 'photo' | 'video' | 'video_upload' | 'timeline' | 'guestbook' | 'redirect' | 'user' | 'site_settings'
  entityId: string
  metadata?: Record<string, unknown>
}

type AuditEntity =
  | 'memorial'
  | 'photo'
  | 'video'
  | 'video_upload'
  | 'timeline'
  | 'guestbook'
  | 'redirect'
  | 'user'
  | 'site_settings'

type LegacyAuditEntity = 'page'
type AuditLogEntity = AuditEntity | LegacyAuditEntity

type RawAuditLog = {
  id: string
  actor_id: string
  action: AuditLogAction
  entity: AuditLogEntity
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function logAdminAudit(supabase: AdminSupabase, input: LogAdminAuditInput) {
  const { actorId, action, entity, entityId, metadata } = input
  try {
    await supabase.from('admin_audit_logs').insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      metadata: metadata ?? {},
    })
  } catch {
    // Do not fail product flows if audit logging is unavailable.
  }
}

export function normalizeAuditAction(action: AuditLogAction): AuditAction {
  if (action === 'page.create') return 'memorial.create'
  if (action === 'page.update') return 'memorial.update'
  return action
}

export function normalizeAuditEntity(entity: AuditLogEntity): AuditEntity {
  return entity === 'page' ? 'memorial' : entity
}

export function normalizeAdminAuditLog(log: RawAuditLog) {
  return {
    ...log,
    action: normalizeAuditAction(log.action),
    entity: normalizeAuditEntity(log.entity),
  }
}
