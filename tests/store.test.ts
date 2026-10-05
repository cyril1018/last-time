import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Store, FutureTimeError, EmptyNameError, NotFoundError } from '../src/lib/store.svelte'
import { createDb, loadAll, type LastTimeDB } from '../src/lib/db'
import type { KeyValueStorage } from '../src/lib/settings'

const T0 = new Date(2026, 9, 5, 9, 0).getTime()
const HOUR = 3_600_000
const DAY = 86_400_000

function memStorage(): KeyValueStorage {
  const map = new Map<string, string>()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

let db: LastTimeDB
let store: Store
let now = T0
let n = 0
beforeEach(async () => {
  now = T0
  db = createDb(`store-${n++}`)
  store = new Store(db, memStorage(), () => now)
  await store.init()
})

describe('init', () => {
  it('loads persisted data and marks ready', async () => {
    const r = await store.addItemAndLog('吃藥')
    const again = new Store(db, memStorage(), () => now)
    await again.init()
    expect(again.ready).toBe(true)
    expect(again.items.map((i) => i.id)).toEqual([r.item.id])
    expect(again.records.map((x) => x.id)).toEqual([r.record.id])
  })
})

describe('addItemAndLog', () => {
  it('creates item with guessed emoji and a record at now', async () => {
    const r = await store.addItemAndLog('  換瓦斯 ')
    expect(r.itemCreated).toBe(true)
    expect(r.item).toMatchObject({ name: '換瓦斯', emoji: '🔥', expectDays: null, archived: false, created: T0 })
    expect(r.record).toMatchObject({ itemId: r.item.id, ts: T0, note: '' })
    expect(store.lastTs.get(r.item.id)).toBe(T0)
    expect((await loadAll(db)).items).toHaveLength(1)
  })
  it('rejects blank names', async () => {
    await expect(store.addItemAndLog('   ')).rejects.toBeInstanceOf(EmptyNameError)
    expect(store.items).toHaveLength(0)
  })
  it('logs onto an existing item when the normalized name matches', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += HOUR
    const b = await store.addItemAndLog(' 吃藥')
    expect(b.itemCreated).toBe(false)
    expect(b.item.id).toBe(a.item.id)
    expect(store.items).toHaveLength(1)
    expect(store.recordsOf(a.item.id).map((r) => r.ts)).toEqual([T0 + HOUR, T0])
  })
  it('findByName still matches archived items so they are not duplicated', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    expect(store.findByName('吃藥')?.id).toBe(a.item.id)
  })
})

describe('addItemAndLog on archived items', () => {
  it('unarchives the matching item and logs onto it', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    now += HOUR
    const b = await store.addItemAndLog('吃藥')
    expect(b.itemCreated).toBe(false)
    expect(b.item.id).toBe(a.item.id)
    expect(b.item.archived).toBe(false)
    expect(store.itemById(a.item.id)?.archived).toBe(false)
    expect((await loadAll(db)).items[0]?.archived).toBe(false)
    expect(store.recordsOf(a.item.id)).toHaveLength(2)
  })
  it('logNow by id leaves the archived state alone', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    now += HOUR
    await store.logNow(a.item.id)
    expect(store.itemById(a.item.id)?.archived).toBe(true)
    expect((await loadAll(db)).items[0]?.archived).toBe(true)
  })
})

describe('logNow / undoLog', () => {
  it('logNow adds a record and returns itemCreated=false', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += 2 * HOUR
    const r = await store.logNow(a.item.id)
    expect(r.itemCreated).toBe(false)
    expect(store.records).toHaveLength(2)
    expect(store.lastTs.get(a.item.id)).toBe(T0 + 2 * HOUR)
  })
  it('logNow on unknown item throws NotFoundError', async () => {
    await expect(store.logNow('nope')).rejects.toBeInstanceOf(NotFoundError)
  })
  it('undo of a fresh item removes record and item', async () => {
    const r = await store.addItemAndLog('吃藥')
    await store.undoLog(r)
    expect(store.items).toEqual([])
    expect(store.records).toEqual([])
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
  it('undo of a log on an existing item keeps the item', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += HOUR
    const r = await store.logNow(a.item.id)
    await store.undoLog(r)
    expect(store.items).toHaveLength(1)
    expect(store.records.map((x) => x.id)).toEqual([a.record.id])
  })
  it('undo is a no-op when the record (or item) is already gone', async () => {
    const r = await store.addItemAndLog('吃藥')
    await store.deleteItem(r.item.id)
    await expect(store.undoLog(r)).resolves.toBeUndefined()
    expect(store.items).toEqual([])
  })
})

describe('records', () => {
  it('addRecord rejects future timestamps beyond 1 minute', async () => {
    const a = await store.addItemAndLog('吃藥')
    await expect(store.addRecord(a.item.id, now + 2 * HOUR)).rejects.toBeInstanceOf(FutureTimeError)
    await expect(store.addRecord(a.item.id, now + 30_000)).resolves.toBeTruthy()
    expect(store.records).toHaveLength(2)
  })
  it('addRecords adds one per timestamp with shared note', async () => {
    const a = await store.addItemAndLog('吃藥')
    const rs = await store.addRecords(a.item.id, [T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY], 'x')
    expect(rs).toHaveLength(3)
    expect(store.recordsOf(a.item.id).map((r) => r.ts)).toEqual([T0, T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY])
    expect(rs.every((r) => r.note === 'x')).toBe(true)
  })
  it('ids minted on a frozen clock stay unique and in creation order', async () => {
    const a = await store.addItemAndLog('吃藥')
    const rs = await store.addRecords(a.item.id, Array.from({ length: 50 }, (_, i) => T0 - (i + 1) * DAY))
    const ids = [a.item.id, a.record.id, ...rs.map((r) => r.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(ids)
  })
  it('updateRecord changes ts/note and rejects future ts', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateRecord(a.record.id, { ts: T0 - HOUR, note: '早上' })
    expect(store.recordById(a.record.id)).toMatchObject({ ts: T0 - HOUR, note: '早上' })
    await expect(store.updateRecord(a.record.id, { ts: now + DAY })).rejects.toBeInstanceOf(FutureTimeError)
    expect(store.recordById(a.record.id)?.ts).toBe(T0 - HOUR)
    expect((await loadAll(db)).records[0]?.ts).toBe(T0 - HOUR)
  })
  it('deleteRecord', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.deleteRecord(a.record.id)
    expect(store.records).toEqual([])
    expect(store.items).toHaveLength(1)
  })
})

describe('items', () => {
  it('updateItem normalizes name and expectDays', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { name: ' 早上吃藥 ', emoji: '🌅', expectDays: '1' })
    expect(store.itemById(a.item.id)).toMatchObject({ name: '早上吃藥', emoji: '🌅', expectDays: 1 })
    await store.updateItem(a.item.id, { expectDays: '0' })
    expect(store.itemById(a.item.id)?.expectDays).toBeNull()
    await expect(store.updateItem(a.item.id, { name: ' ' })).rejects.toBeInstanceOf(EmptyNameError)
  })
  it('deleteItem cascades to records', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.addRecords(a.item.id, [T0 - DAY])
    await store.deleteItem(a.item.id)
    expect(store.items).toEqual([])
    expect(store.records).toEqual([])
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
})

describe('bulk', () => {
  const item = (id: string) => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1 })
  const rec = (id: string, itemId: string) => ({ id, itemId, ts: 1, note: '' })
  it('mergeIn appends', async () => {
    await store.addItemAndLog('吃藥')
    await store.mergeIn([item('x')], [rec('rx', 'x')])
    expect(store.items).toHaveLength(2)
    expect(store.records).toHaveLength(2)
  })
  it('replaceWith wipes first', async () => {
    await store.addItemAndLog('吃藥')
    await store.replaceWith([item('x')], [rec('rx', 'x')])
    expect(store.items.map((i) => i.id)).toEqual(['x'])
    expect(store.records.map((r) => r.id)).toEqual(['rx'])
  })
  it('clearAllData empties both and resets backup settings but keeps theme/vibrate', async () => {
    await store.addItemAndLog('吃藥')
    store.updateSettings({ theme: 'dark', vibrate: false, lastBackupAt: 5, backupSnoozeUntil: 6 })
    await store.clearAllData()
    expect(store.items).toEqual([])
    expect(store.settings).toEqual({ theme: 'dark', vibrate: false, lastBackupAt: null, backupSnoozeUntil: null })
  })
})

describe('persistence failure', () => {
  it('rolls back memory and rethrows the original error', async () => {
    const a = await store.addItemAndLog('吃藥')
    const items = store.items
    const records = store.records
    const boom = new Error('boom')
    vi.spyOn(db.records, 'put').mockRejectedValueOnce(boom)
    await expect(store.addRecord(a.item.id, T0 - HOUR)).rejects.toBe(boom)
    expect(store.records).toEqual(records)
    expect(store.items).toEqual(items)
    expect((await loadAll(db)).records).toHaveLength(1)
  })
  it('still restores the snapshot and rethrows the original error when reload also fails', async () => {
    const a = await store.addItemAndLog('吃藥')
    const records = store.records
    const boom = new Error('boom')
    vi.spyOn(db.records, 'put').mockRejectedValueOnce(boom)
    vi.spyOn(db.records, 'toArray').mockRejectedValueOnce(new Error('unreadable'))
    await expect(store.addRecord(a.item.id, T0 - HOUR)).rejects.toBe(boom)
    expect(store.records).toEqual(records)
  })
})

describe('settings and clock', () => {
  it('updateSettings persists to storage', async () => {
    const storage = memStorage()
    const s = new Store(createDb(`store-settings-${n++}`), storage, () => now)
    await s.init()
    s.updateSettings({ theme: 'light' })
    const s2 = new Store(createDb(`store-settings-${n++}`), storage, () => now)
    await s2.init()
    expect(s2.settings.theme).toBe('light')
  })
  it('tick updates now', () => {
    now = T0 + 5
    store.tick()
    expect(store.now).toBe(T0 + 5)
  })
})
