export type MemorialAccessMode = 'public' | 'private' | 'password'
export type LegacyMemorialPrivacy = 'public' | 'private'

type MemorialAccessFields = {
  access_mode?: MemorialAccessMode | null
  privacy?: LegacyMemorialPrivacy | null
}

export function resolveMemorialAccessMode(record: MemorialAccessFields): MemorialAccessMode {
  return record.access_mode || (record.privacy === 'private' ? 'private' : 'public')
}

export function persistLegacyMemorialPrivacy(accessMode: MemorialAccessMode | undefined) {
  if (!accessMode) return undefined
  return accessMode === 'public' ? 'public' : 'private'
}

export function toMemorialRecord<T extends MemorialAccessFields>(record: T) {
  const rest = { ...record }
  delete rest.access_mode
  delete rest.privacy
  return {
    ...rest,
    accessMode: resolveMemorialAccessMode(record),
  }
}

type MemorialScopedInput = {
  memorialId?: string
  pageId?: string
}

export function resolveMemorialId(input: MemorialScopedInput) {
  return input.memorialId || input.pageId || null
}
