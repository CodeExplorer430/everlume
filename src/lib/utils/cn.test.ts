import { cn } from '@/lib/utils/cn'

describe('cn', () => {
  it('merges classes and resolves conflicts', () => {
    expect(cn('p-2', 'p-4', 'text-sm', 'text-lg')).toBe('p-4 text-lg')
  })

  it('ignores falsy values', () => {
    expect(cn('rounded', false && 'hidden', undefined, null, 'px-2')).toBe('rounded px-2')
  })
})
