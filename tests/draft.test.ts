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
  it('saveDraft and clearDraft never throw when storage throws', () => {
    const s = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => { throw new Error('denied') } }
    expect(() => saveDraft('k', { a: 1 }, s)).not.toThrow()
    expect(() => clearDraft('k', s)).not.toThrow()
  })
  it('loadDraft returns null when getItem throws', () => {
    const s = { getItem: () => { throw new Error('denied') }, setItem: () => {}, removeItem: () => {} }
    expect(loadDraft('k', s)).toBeNull()
  })
  it('never throws when sessionStorage access itself throws', () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    try {
      expect(() => saveDraft('k', 1)).not.toThrow()
      expect(loadDraft('k')).toBeNull()
      expect(() => clearDraft('k')).not.toThrow()
    } finally {
      if (orig) Object.defineProperty(globalThis, 'sessionStorage', orig)
      else delete (globalThis as { sessionStorage?: unknown }).sessionStorage
    }
  })
})
