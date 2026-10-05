import { describe, it, expect } from 'vitest'
import { dedupeById } from '../src/lib/collections'

describe('dedupeById', () => {
  it('keeps the last row per id, in order of first appearance', () => {
    const rows = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'a', v: 2 }, { id: 'c', v: 1 }, { id: 'b', v: 3 }]
    expect(dedupeById(rows)).toEqual([{ id: 'a', v: 2 }, { id: 'b', v: 3 }, { id: 'c', v: 1 }])
  })
  it('returns a new array and leaves the input alone', () => {
    const rows = Object.freeze([{ id: 'a' }])
    const out = dedupeById(rows)
    expect(out).toEqual([{ id: 'a' }])
    expect(out).not.toBe(rows)
  })
  it('handles an empty list', () => {
    expect(dedupeById([])).toEqual([])
  })
})
