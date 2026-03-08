import {
  normalizeAdminAuditLog,
  normalizeAuditAction,
  normalizeAuditEntity,
} from '@/lib/server/admin-audit'

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
