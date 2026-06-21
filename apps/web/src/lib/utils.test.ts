import { describe, expect, it } from 'vitest'
import { cn, getPageNumbers, normalizeDate, normalizeEpoch } from './utils'

describe('getPageNumbers', () => {
  it('returns all pages when the total is small', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('uses ellipsis around the current page for larger datasets', () => {
    expect(getPageNumbers(6, 10)).toEqual([1, '...', 5, 6, 7, '...', 10])
  })

  it('keeps the first and last page visible near the end', () => {
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })
})

describe('date normalization helpers', () => {
  it('normalizes second and millisecond epochs to the same ISO string', () => {
    expect(normalizeDate(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z')
    expect(normalizeDate(1_700_000_000_000)).toBe('2023-11-14T22:13:20.000Z')
  })

  it('normalizes millisecond epochs back to seconds', () => {
    expect(normalizeEpoch(1_700_000_000_000)).toBe(1_700_000_000)
    expect(normalizeEpoch(1_700_000_000)).toBe(1_700_000_000)
  })
})

describe('cn', () => {
  it('merges tailwind classes with later values taking precedence', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })
})
