import { vi } from 'vitest'

interface Entry { state: unknown; hash: string }

/**
 * Minimal same-document session history: pushState/replaceState are synchronous, back()/go() are queued
 * like a real browser and only applied by flush(), which fires popstate (and hashchange when the fragment
 * changes). Going back past the first entry marks the app as left, unless `edge` is 'stay': then there is
 * nothing before the first entry (a PWA launched on its own), and that back is a no-op with no popstate.
 */
export class FakeBrowser {
  entries: Entry[]
  index: number
  left = false
  edge: 'leave' | 'stay' = 'leave'
  private queued: number[] = []
  readonly window = new EventTarget()

  constructor(hash = '', state: unknown = null, entries?: Entry[], index?: number) {
    this.entries = entries ? entries.map((e) => ({ ...e, state: structuredClone(e.state) })) : [{ state: structuredClone(state), hash }]
    this.index = index ?? this.entries.length - 1
  }

  get top(): Entry { return this.entries[this.index]! }

  readonly history = {
    get: () => this,
    get state(): unknown { return this.get().top.state },
    pushState: (state: unknown, _t: string, url?: string) => {
      this.entries.splice(this.index + 1)
      this.entries.push({ state: structuredClone(state), hash: url ?? this.top.hash })
      this.index++
    },
    replaceState: (state: unknown, _t: string, url?: string) => {
      this.entries[this.index] = { state: structuredClone(state), hash: url ?? this.top.hash }
    },
    back: () => { this.queued.push(-1) },
    go: (d: number) => { this.queued.push(d) },
  }

  readonly location = {
    get: () => this,
    get hash(): string { const h = this.get().top.hash; return h === '#' ? '' : h },
  }

  /** The user's system back key. */
  systemBack(): void { this.queued.push(-1) }

  /**
   * Apply queued traversals one task at a time, letting promise chains run in between. `limit` stops after
   * that many queued traversals (to look at the state between two of them).
   */
  async flush(limit = Infinity): Promise<void> {
    for (let guard = 0; guard < 50; guard++) {
      await new Promise((r) => setTimeout(r, 0))
      if (limit-- <= 0) return
      const d = this.queued.shift()
      if (d === undefined) return
      if (this.left) continue
      const target = this.index + d
      if (target < 0 && this.edge === 'stay') continue
      if (target < 0) { this.left = true; this.queued = []; continue }
      if (target >= this.entries.length) continue
      const oldHash = this.top.hash
      this.index = target
      this.window.dispatchEvent(new Event('popstate'))
      if (this.top.hash !== oldHash) this.window.dispatchEvent(new Event('hashchange'))
    }
    throw new Error('traversal loop did not settle')
  }

  /** Same entries and position, fresh page (what a reload or tab reclaim gives you). */
  reload(): FakeBrowser {
    return new FakeBrowser('', null, this.entries, this.index)
  }

  install(): void {
    vi.stubGlobal('window', this.window)
    vi.stubGlobal('history', this.history)
    vi.stubGlobal('location', this.location)
  }

  hashes(): string[] { return this.entries.map((e) => e.hash) }
}
