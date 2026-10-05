import { describe, it, expect } from 'vitest'
import { newId, nextId, ID_PATTERN } from '../src/lib/ids'

describe('newId', () => {
  it('is 13 lowercase base36 chars', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(ID_PATTERN)
  })
  it('is deterministic given time and rand', () => {
    const a = newId(1791139600000, () => 0.5)
    const b = newId(1791139600000, () => 0.5)
    expect(a).toBe(b)
    expect(a).toHaveLength(13)
  })
})

describe('nextId', () => {
  it('is unique across many calls in the same millisecond', () => {
    const now = Date.now()
    const ids = new Set(Array.from({ length: 2000 }, () => nextId(now)))
    expect(ids.size).toBe(2000)
  })
  it('keeps the 13-char base36 format', () => {
    const now = Date.now()
    for (let i = 0; i < 200; i++) expect(nextId(now)).toMatch(ID_PATTERN)
  })
  it('is strictly increasing in key order (Dexie / string sort), even with a clock that stalls or goes back', () => {
    const base = Date.now()
    const clock = [base, base, base, base - 5000, base + 1, base + 1, base - 1]
    const ids = Array.from({ length: 300 }, (_, i) => nextId(clock[i % clock.length]))
    const sorted = [...ids].sort()
    expect(sorted).toEqual(ids)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('uses the given time as the prefix when it is ahead of the last id', () => {
    const later = Date.now() + 10 * 365 * 86_400_000
    expect(nextId(later).slice(0, 8)).toBe(later.toString(36))
  })
})
