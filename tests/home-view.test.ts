import { describe, it, expect } from 'vitest'
import { homeView } from '../src/lib/home-view'
import type { Item } from '../src/lib/types'

const item = (id: string, name: string, over: Partial<Item> = {}): Item =>
  ({ id, name, emoji: '📌', expectDays: null, archived: false, created: 0, ...over })

const items = [
  item('a', '吃藥'),
  item('b', '換瓦斯'),
  item('c', 'Run 5K'),
  item('d', '早上吃藥'),
  item('z', '剪頭髮', { archived: true }),
]
const lastTs = new Map([['a', 30], ['b', 20], ['c', 10]])

describe('homeView', () => {
  it('empty query: every unarchived item in home order, no add row', () => {
    const v = homeView(items, lastTs, '')
    expect(v.visible.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(v.exact).toBeUndefined()
    expect(v.showAdd).toBe(false)
    expect(v.addLabelKind).toBeNull()
  })
  it('a whitespace-only query behaves like an empty one', () => {
    expect(homeView(items, lastTs, '   ')).toEqual(homeView(items, lastTs, ''))
  })
  it('filters by name containing the normalized query, keeping home order', () => {
    expect(homeView(items, lastTs, ' 吃藥 ').visible.map((i) => i.id)).toEqual(['a', 'd'])
  })
  it('filtering is case-insensitive', () => {
    expect(homeView(items, lastTs, 'run').visible.map((i) => i.id)).toEqual(['c'])
    expect(homeView(items, lastTs, 'RUN 5k').visible.map((i) => i.id)).toEqual(['c'])
  })
  it('an exact match hides the add row', () => {
    const v = homeView(items, lastTs, '吃藥')
    expect(v.exact?.id).toBe('a')
    expect(v.showAdd).toBe(false)
    expect(v.addLabelKind).toBeNull()
  })
  it('no exact match shows the add row with the add label', () => {
    const v = homeView(items, lastTs, '吃')
    expect(v.exact).toBeUndefined()
    expect(v.showAdd).toBe(true)
    expect(v.addLabelKind).toBe('add')
  })
  it('an archived exact match shows the add row with the restore label, and is not listed', () => {
    const v = homeView(items, lastTs, '剪頭髮')
    expect(v.exact?.id).toBe('z')
    expect(v.showAdd).toBe(true)
    expect(v.addLabelKind).toBe('restore')
    expect(v.visible).toEqual([])
  })
})

describe('homeView empty state (onboarding)', () => {
  it('no items at all: empty, nothing archived', () => {
    const v = homeView([], new Map(), '')
    expect(v.empty).toBe(true)
    expect(v.archivedCount).toBe(0)
  })
  it('every item archived and no query: empty, with the archived count', () => {
    const all = [item('x', 'A', { archived: true }), item('y', 'B', { archived: true })]
    const v = homeView(all, new Map(), '  ')
    expect(v.empty).toBe(true)
    expect(v.archivedCount).toBe(2)
  })
  it('a query never shows the empty state, even with nothing visible', () => {
    expect(homeView([], new Map(), '吃藥').empty).toBe(false)
    expect(homeView([item('x', 'A', { archived: true })], new Map(), 'A').empty).toBe(false)
  })
  it('visible items: not empty; archived ones are still counted', () => {
    const v = homeView(items, lastTs, '')
    expect(v.empty).toBe(false)
    expect(v.archivedCount).toBe(1)
  })
})
