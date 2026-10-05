import { describe, it, expect } from 'vitest'
import { saveDraft, loadDraft, clearDraft } from '../src/lib/draft'

function mem() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('draft', () => {
  it('round trips and clears', () => {
    const s = mem()
    saveDraft('k', { a: 1 }, s)
    expect(loadDraft<{ a: number }>('k', s)).toEqual({ a: 1 })
    clearDraft('k', s)
    expect(loadDraft('k', s)).toBeNull()
  })
  it('returns null for garbage', () => {
    const s = mem()
    s.setItem('lasttime.draft.k', '{bad')
    expect(loadDraft('k', s)).toBeNull()
  })
})
