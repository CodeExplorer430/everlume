import {
  persistLegacyMemorialPrivacy,
  resolveMemorialAccessMode,
  resolveMemorialId,
  toMemorialRecord,
} from '@/lib/server/memorials'

describe('memorial helpers', () => {
  it('prefers canonical access mode and falls back to legacy privacy', () => {
    expect(resolveMemorialAccessMode({ access_mode: 'password', privacy: 'public' })).toBe('password')
    expect(resolveMemorialAccessMode({ privacy: 'private' })).toBe('private')
    expect(resolveMemorialAccessMode({ privacy: 'public' })).toBe('public')
  })

  it('maps canonical access mode back to legacy privacy for persistence', () => {
    expect(persistLegacyMemorialPrivacy(undefined)).toBeUndefined()
    expect(persistLegacyMemorialPrivacy('public')).toBe('public')
    expect(persistLegacyMemorialPrivacy('password')).toBe('private')
    expect(persistLegacyMemorialPrivacy('private')).toBe('private')
  })

  it('returns canonical memorial records without leaking storage fields', () => {
    expect(
      toMemorialRecord({
        id: 'memorial-1',
        title: 'In Memory',
        access_mode: 'public',
        privacy: 'private',
      })
    ).toEqual({
      id: 'memorial-1',
      title: 'In Memory',
      accessMode: 'public',
    })
  })

  it('accepts either memorialId or legacy pageId when resolving scoped ids', () => {
    expect(resolveMemorialId({ memorialId: 'memorial-1', pageId: 'page-1' })).toBe('memorial-1')
    expect(resolveMemorialId({ pageId: 'page-1' })).toBe('page-1')
    expect(resolveMemorialId({})).toBeNull()
  })
})
