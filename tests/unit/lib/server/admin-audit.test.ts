import {
  logAdminAudit,
  normalizeAdminAuditLog,
  normalizeAuditAction,
  normalizeAuditEntity,
} from '@/lib/server/admin-audit'

describe('logAdminAudit', () => {
  it('inserts the expected audit payload', async () => {
    const insert = vi.fn().mockResolvedValue({})
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as Parameters<typeof logAdminAudit>[0]

    await logAdminAudit(supabase, {
      actorId: 'user-1',
      action: 'video.create',
      entity: 'video',
      entityId: 'video-1',
      metadata: { source: 'upload' },
    })

    expect(supabase.from).toHaveBeenCalledWith('admin_audit_logs')
    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'video.create',
      entity: 'video',
      entity_id: 'video-1',
      metadata: { source: 'upload' },
    })
  })

  it('defaults metadata to an empty object when omitted', async () => {
    const insert = vi.fn().mockResolvedValue({})
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as Parameters<typeof logAdminAudit>[0]

    await logAdminAudit(supabase, {
      actorId: 'user-2',
      action: 'photo.delete',
      entity: 'photo',
      entityId: 'photo-1',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} })
    )
  })

  it('swallows insert failures so audit issues do not break product flows', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('audit offline'))
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as Parameters<typeof logAdminAudit>[0]

    await expect(
      logAdminAudit(supabase, {
        actorId: 'user-3',
        action: 'timeline.create',
        entity: 'timeline',
        entityId: 'event-1',
      })
    ).resolves.toBeUndefined()
  })
})

describe('admin audit normalization', () => {
  it('normalizes legacy page actions and preserves canonical memorial actions', () => {
    expect(normalizeAuditAction('page.create')).toBe('memorial.create')
    expect(normalizeAuditAction('page.update')).toBe('memorial.update')
    expect(normalizeAuditAction('memorial.update')).toBe('memorial.update')
  })

  it('normalizes legacy page entities and preserves canonical memorial entities', () => {
    expect(normalizeAuditEntity('page')).toBe('memorial')
    expect(normalizeAuditEntity('memorial')).toBe('memorial')
  })

  it('normalizes full audit log records on read', () => {
    expect(
      normalizeAdminAuditLog({
        id: 'log-1',
        actor_id: 'user-1',
        action: 'page.create',
        entity: 'page',
        entity_id: 'memorial-1',
        metadata: { source: 'legacy' },
        created_at: '2026-03-09T00:00:00.000Z',
      })
    ).toMatchObject({
      id: 'log-1',
      action: 'memorial.create',
      entity: 'memorial',
    })
  })
})
