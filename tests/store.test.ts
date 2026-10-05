import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dexie from 'dexie'
import {
  Store, FutureTimeError, EmptyNameError, NotFoundError, DuplicateNameError, InvalidTimeError,
} from '../src/lib/store.svelte'
import { createDb, loadAll, type LastTimeDB } from '../src/lib/db'
import type { KeyValueStorage } from '../src/lib/settings'
import { DEFAULT_SETTINGS, type Item, type ItemRecord } from '../src/lib/types'

const T0 = new Date(2026, 9, 5, 9, 0).getTime()
const HOUR = 3_600_000
const DAY = 86_400_000

function memStorage(): KeyValueStorage {
  const map = new Map<string, string>()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

const byId = <T extends { id: string }>(xs: readonly T[]): T[] => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

/** The DB as a fresh Store sees it (what a reload would show). */
async function disk(): Promise<{ items: Item[]; records: ItemRecord[] }> {
  const all = await loadAll(db)
  return { items: byId(all.items), records: byId(all.records) }
}

/** In-memory state equals the persisted state (order-insensitive). */
async function expectSynced(): Promise<void> {
  expect({ items: byId(store.items), records: byId(store.records) }).toEqual(await disk())
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
    expect((await disk()).items).toEqual([r.item])
    expect((await disk()).records).toEqual([r.record])
  })
  it('rejects a future ts on the new-item path and writes nothing', async () => {
    await expect(store.addItemAndLog('吃藥', now + 2 * HOUR)).rejects.toBeInstanceOf(FutureTimeError)
    expect(store.items).toEqual([])
    expect(await disk()).toEqual({ items: [], records: [] })
  })
  it.each([NaN, Infinity, -Infinity])('rejects a non-finite ts (%p) and writes nothing', async (ts) => {
    await expect(store.addItemAndLog('吃藥', ts)).rejects.toBeInstanceOf(InvalidTimeError)
    expect(store.items).toEqual([])
    expect(await disk()).toEqual({ items: [], records: [] })
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
  it('findByName matches archived items too, so logging the same name does not create a duplicate', async () => {
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
    expect(b.itemUnarchived).toBe(true)
    await expectSynced()
  })
  it('validates ts before unarchiving: a rejected log leaves the item archived', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    await expect(store.addItemAndLog('吃藥', now + DAY)).rejects.toBeInstanceOf(FutureTimeError)
    await expect(store.addItemAndLog('吃藥', NaN)).rejects.toBeInstanceOf(InvalidTimeError)
    expect(store.itemById(a.item.id)?.archived).toBe(true)
    expect((await disk()).items[0]?.archived).toBe(true)
    expect(store.records).toHaveLength(1)
    await expectSynced()
  })
  it('undo of a log that unarchived the item archives it again', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    now += HOUR
    const b = await store.addItemAndLog('吃藥')
    await store.undoLog(b)
    expect(store.itemById(a.item.id)?.archived).toBe(true)
    expect(store.records.map((r) => r.id)).toEqual([a.record.id])
    await expectSynced()
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
    expect(r.itemUnarchived).toBe(false)
    expect(store.records).toHaveLength(2)
    expect(store.lastTs.get(a.item.id)).toBe(T0 + 2 * HOUR)
    await expectSynced()
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
    expect(store.items[0]?.archived).toBe(false)
    await expectSynced()
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
    await expectSynced()
  })
  it('every ts-taking mutation rejects non-finite values before touching anything', async () => {
    const a = await store.addItemAndLog('吃藥')
    await expect(store.addRecord(a.item.id, NaN)).rejects.toBeInstanceOf(InvalidTimeError)
    await expect(store.logNow(a.item.id, Infinity)).rejects.toBeInstanceOf(InvalidTimeError)
    await expect(store.addRecords(a.item.id, [T0 - DAY, NaN])).rejects.toBeInstanceOf(InvalidTimeError)
    await expect(store.updateRecord(a.record.id, { ts: NaN })).rejects.toBeInstanceOf(InvalidTimeError)
    expect(store.records).toEqual([a.record])
    await expectSynced()
  })
  it('addRecords adds one per timestamp with shared note', async () => {
    const a = await store.addItemAndLog('吃藥')
    const rs = await store.addRecords(a.item.id, [T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY], 'x')
    expect(rs).toHaveLength(3)
    expect(store.recordsOf(a.item.id).map((r) => r.ts)).toEqual([T0, T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY])
    expect(rs.every((r) => r.note === 'x')).toBe(true)
    await expectSynced()
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
    await expectSynced()
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
    expect((await disk()).items[0]).toMatchObject({ name: '早上吃藥', emoji: '🌅', expectDays: null })
    await expectSynced()
  })
  it('updateItem rejects renaming to the name of another item, archived or not', async () => {
    const a = await store.addItemAndLog('吃藥')
    const b = await store.addItemAndLog('換瓦斯')
    await expect(store.updateItem(b.item.id, { name: ' 吃藥 ' })).rejects.toBeInstanceOf(DuplicateNameError)
    await store.updateItem(a.item.id, { archived: true })
    await expect(store.updateItem(b.item.id, { name: '吃藥' })).rejects.toBeInstanceOf(DuplicateNameError)
    expect(store.itemById(b.item.id)?.name).toBe('換瓦斯')
    await expectSynced()
  })
  it('updateItem keeps its own name without a duplicate error', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { name: '吃藥 ', emoji: '💉' })
    expect(store.itemById(a.item.id)).toMatchObject({ name: '吃藥', emoji: '💉' })
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

describe('errors', () => {
  it('every error class sets its name', () => {
    expect(new FutureTimeError().name).toBe('FutureTimeError')
    expect(new InvalidTimeError().name).toBe('InvalidTimeError')
    expect(new EmptyNameError().name).toBe('EmptyNameError')
    expect(new NotFoundError('item').name).toBe('NotFoundError')
    expect(new DuplicateNameError().name).toBe('DuplicateNameError')
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
    await expectSynced()
  })
  it('mergeIn dedupes ids in its input (last wins), matching what the DB stores', async () => {
    await store.mergeIn(
      [item('x'), { ...item('x'), name: 'x2' }],
      [rec('rx', 'x'), { ...rec('rx', 'x'), note: 'later' }],
    )
    expect(store.items).toEqual([{ ...item('x'), name: 'x2' }])
    expect(store.records).toEqual([{ ...rec('rx', 'x'), note: 'later' }])
    await expectSynced()
  })
  it('replaceWith wipes first', async () => {
    await store.addItemAndLog('吃藥')
    await store.replaceWith([item('x')], [rec('rx', 'x')])
    expect(store.items.map((i) => i.id)).toEqual(['x'])
    expect(store.records.map((r) => r.id)).toEqual(['rx'])
    await expectSynced()
  })
  it('clearAllData empties both and resets backup settings but keeps theme/vibrate', async () => {
    await store.addItemAndLog('吃藥')
    store.updateSettings({ theme: 'dark', vibrate: false, lastBackupAt: 5, backupSnoozeUntil: 6 })
    await store.clearAllData()
    expect(store.items).toEqual([])
    expect(store.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', vibrate: false })
    expect(await disk()).toEqual({ items: [], records: [] })
    await expectSynced()
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
  it('interleaved mutations: the first fails, the second succeeds, memory ends equal to the DB', async () => {
    const a = await store.addItemAndLog('吃藥')
    const boom = new Error('boom')
    vi.spyOn(db.records, 'put').mockRejectedValueOnce(boom)
    // Hold the second write until the first has failed.
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const realPut = db.items.put.bind(db.items)
    vi.spyOn(db.items, 'put').mockImplementationOnce((...args) => Dexie.Promise.resolve(gate).then(() => realPut(...args)))
    const first = store.addRecord(a.item.id, T0 - HOUR)
    const second = store.updateItem(a.item.id, { name: '早上吃藥' })
    await expect(first).rejects.toBe(boom)
    release()
    await second
    expect(store.itemById(a.item.id)?.name).toBe('早上吃藥')
    expect(store.records).toEqual([a.record])
    await expectSynced()
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
