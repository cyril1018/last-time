import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup, summarize, planMerge, planReplace } from '../src/lib/backup'
import type { Item, ItemRecord, Settings } from '../src/lib/types'

const item = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1, ...over })
const rec = (id: string, itemId: string, ts = 1): ItemRecord => ({ id, itemId, ts, note: '' })
const settings: Settings = { theme: 'dark', vibrate: false, lastBackupAt: 5, backupSnoozeUntil: 6 }

describe('serializeBackup', () => {
  it('writes the documented shape and only theme/vibrate from settings', () => {
    const text = serializeBackup([item('a', { expectDays: 14 })], [rec('r1', 'a', 1791139620000)], settings, Date.UTC(2026, 9, 5, 9, 30))
    const j = JSON.parse(text)
    expect(j).toEqual({
      app: 'lasttime',
      version: 1,
      exportedAt: '2026-10-05T09:30:00.000Z',
      items: [{ id: 'a', name: 'a', emoji: '📌', expectDays: 14, archived: false, created: 1 }],
      records: [{ id: 'r1', itemId: 'a', ts: 1791139620000, note: '' }],
      settings: { theme: 'dark', vibrate: false },
    })
    expect(Object.keys(j)).not.toContain('cats')
  })
  it('round-trips through parseBackup', () => {
    const text = serializeBackup([item('a')], [rec('r1', 'a')], settings, 0)
    const res = parseBackup(text)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.backup.items).toEqual([item('a')])
      expect(res.backup.records).toEqual([rec('r1', 'a')])
      expect(res.backup.settings).toEqual({ theme: 'dark', vibrate: false })
    }
  })
})

describe('parseBackup rejects', () => {
  it('non-JSON', () => {
    expect(parseBackup('hello')).toEqual({ ok: false, reason: 'invalid-json' })
    expect(parseBackup('')).toEqual({ ok: false, reason: 'invalid-json' })
  })
  it('JSON that is not a lasttime backup', () => {
    expect(parseBackup('{"app":"other","items":[]}')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('{"app":"lasttime","items":"nope"}')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('[]')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('null')).toEqual({ ok: false, reason: 'not-lasttime' })
  })
})

describe('parseBackup tolerance', () => {
  it('fills defaults, normalizes expectDays, skips bad rows, ignores unknown keys', () => {
    const res = parseBackup(JSON.stringify({
      app: 'lasttime', version: 1, exportedAt: 'x', cats: [{ id: 'c' }],
      items: [
        { id: 'a', name: '吃藥', created: 10, catId: 'c', expectDays: 0, hasPhoto: true },
        { id: '', name: 'bad', created: 1 },
        { id: 'b', name: 'nocreated' },
        { id: 'c', name: 7, created: 1 },
        'junk',
      ],
      records: [
        { id: 'r1', itemId: 'a', ts: 5, note: 'ok', hasPhoto: false },
        { id: 'r2', itemId: 'a', ts: 'five' },
        { id: 'r3', itemId: 'zzz', ts: 6 },
        { id: 'r4', itemId: 'a', ts: 7, note: 42 },
      ],
      settings: { theme: 'light', vibrate: 'yes', other: 1 },
      photos: {},
    }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.backup.items).toEqual([{ id: 'a', name: '吃藥', emoji: '📌', expectDays: null, archived: false, created: 10 }])
    expect(res.backup.records).toEqual([
      { id: 'r1', itemId: 'a', ts: 5, note: 'ok' },
      { id: 'r4', itemId: 'a', ts: 7, note: '' },
    ])
    expect(res.backup.orphanRecords).toEqual([{ id: 'r3', itemId: 'zzz', ts: 6, note: '' }])
    expect(res.backup.settings).toEqual({ theme: 'light' })
    expect(res.backup.exportedAt).toBe('x')
  })
  it('missing records/settings are fine', () => {
    const res = parseBackup('{"app":"lasttime","items":[]}')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.backup.records).toEqual([])
      expect(res.backup.settings).toEqual({})
      expect(res.backup.exportedAt).toBeNull()
    }
  })
})

describe('parseBackup cleanup', () => {
  const parse = (o: object) => {
    const res = parseBackup(JSON.stringify({ app: 'lasttime', ...o }))
    if (!res.ok) throw new Error('rejected')
    return res.backup
  }
  it('dedupes items and records by id, last wins, so counts and plans agree', () => {
    const b = parse({
      items: [{ id: 'a', name: 'first', created: 1 }, { id: 'b', name: 'b', created: 1 }, { id: 'a', name: 'second', created: 2 }],
      records: [
        { id: 'r1', itemId: 'a', ts: 1 }, { id: 'r1', itemId: 'a', ts: 2, note: 'later' },
        { id: 'r9', itemId: 'ghost', ts: 3 }, { id: 'r9', itemId: 'ghost', ts: 4 },
      ],
    })
    expect(b.items).toEqual([item('a', { name: 'second', created: 2 }), item('b')])
    expect(b.records).toEqual([{ id: 'r1', itemId: 'a', ts: 2, note: 'later' }])
    expect(b.orphanRecords).toEqual([{ id: 'r9', itemId: 'ghost', ts: 4, note: '' }])
    expect(summarize(b)).toMatchObject({ itemCount: 2, recordCount: 1 })
    expect(planReplace(b).items).toHaveLength(2)
    expect(planMerge({ items: [], records: [] }, b)).toEqual({ items: b.items, records: b.records })
  })
  it('a record whose id repeats with a different item follows the last row', () => {
    const b = parse({
      items: [{ id: 'a', name: 'a', created: 1 }],
      records: [{ id: 'r1', itemId: 'a', ts: 1 }, { id: 'r1', itemId: 'ghost', ts: 2 }],
    })
    expect(b.records).toEqual([])
    expect(b.orphanRecords).toEqual([{ id: 'r1', itemId: 'ghost', ts: 2, note: '' }])
  })
  it('normalizes names and falls back to 未命名 for empty ones without dropping the item or its records', () => {
    const b = parse({
      items: [{ id: 'a', name: '  吃   藥 ', created: 1 }, { id: 'b', name: '   ', created: 1 }, { id: 'c', name: '', created: 1 }],
      records: [{ id: 'r1', itemId: 'b', ts: 1 }, { id: 'r2', itemId: 'c', ts: 2 }],
    })
    expect(b.items.map((i) => i.name)).toEqual(['吃 藥', '未命名', '未命名'])
    expect(b.records.map((r) => r.id)).toEqual(['r1', 'r2'])
  })
  it('falls back to 📌 for a missing, empty or blank emoji and trims a real one', () => {
    const b = parse({
      items: [
        { id: 'a', name: 'a', created: 1 },
        { id: 'b', name: 'b', created: 1, emoji: '' },
        { id: 'c', name: 'c', created: 1, emoji: '   ' },
        { id: 'd', name: 'd', created: 1, emoji: 5 },
        { id: 'e', name: 'e', created: 1, emoji: ' 🔥 ' },
      ],
    })
    expect(b.items.map((i) => i.emoji)).toEqual(['📌', '📌', '📌', '📌', '🔥'])
  })
  it('string expectDays go through normalizeExpectDays', () => {
    const b = parse({
      items: [
        { id: 'a', name: 'a', created: 1, expectDays: '14' },
        { id: 'b', name: 'b', created: 1, expectDays: ' 7 ' },
        { id: 'c', name: 'c', created: 1, expectDays: '0x1A' },
        { id: 'd', name: 'd', created: 1, expectDays: '1e2' },
        { id: 'e', name: 'e', created: 1, expectDays: '0' },
        { id: 'f', name: 'f', created: 1, expectDays: '' },
      ],
    })
    expect(b.items.map((i) => i.expectDays)).toEqual([14, 7, null, null, null, null])
  })
})

describe('summarize', () => {
  it('counts', () => {
    const res = parseBackup(serializeBackup([item('a'), item('b')], [rec('r1', 'a')], settings, 0))
    if (!res.ok) throw new Error()
    expect(summarize(res.backup)).toEqual({ exportedAt: '1970-01-01T00:00:00.000Z', itemCount: 2, recordCount: 1 })
  })
})

describe('planMerge / planReplace', () => {
  const existing = { items: [item('a', { name: 'mine' })], records: [rec('r1', 'a')] }
  const parsed = (() => {
    const res = parseBackup(JSON.stringify({
      app: 'lasttime',
      items: [{ id: 'a', name: 'theirs', created: 1 }, { id: 'b', name: 'b', created: 1 }],
      records: [{ id: 'r1', itemId: 'a', ts: 1 }, { id: 'r2', itemId: 'b', ts: 2 }, { id: 'r3', itemId: 'a', ts: 3 }, { id: 'r4', itemId: 'ghost', ts: 4 }],
    }))
    if (!res.ok) throw new Error()
    return res.backup
  })()
  it('merge skips existing ids and keeps existing versions', () => {
    const plan = planMerge(existing, parsed)
    expect(plan.items.map((i) => i.id)).toEqual(['b'])
    expect(plan.records.map((r) => r.id)).toEqual(['r2', 'r3'])
  })
  it('merge accepts orphan records whose item exists locally', () => {
    const plan = planMerge({ items: [item('ghost')], records: [] }, parsed)
    expect(plan.records.map((r) => r.id)).toContain('r4')
  })
  it('merging the same file twice adds nothing new', () => {
    const first = planMerge(existing, parsed)
    const after = { items: [...existing.items, ...first.items], records: [...existing.records, ...first.records] }
    expect(planMerge(after, parsed)).toEqual({ items: [], records: [] })
  })
  it('replace uses file contents only, dropping orphans', () => {
    const plan = planReplace(parsed)
    expect(plan.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(plan.records.map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })
})
