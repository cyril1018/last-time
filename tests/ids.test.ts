import { describe, it, expect } from 'vitest'
import { newId, ID_PATTERN } from '../src/lib/ids'

describe('newId', () => {
  it('is 13 lowercase base36 chars', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(ID_PATTERN)
  })
  it('is unique across many calls', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId()))
    expect(ids.size).toBe(2000)
  })
  it('is deterministic given time and rand', () => {
    const a = newId(1791139600000, () => 0.5)
    const b = newId(1791139600000, () => 0.5)
    expect(a).toBe(b)
    expect(a).toHaveLength(13)
  })
})
