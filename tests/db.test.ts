import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDb, loadAll, putItem, deleteItemCascade, putRecord, putRecords, deleteRecord, addMany, replaceAll, clearAll,
  type LastTimeDB,
} from '../src/lib/db'
import type { Item, ItemRecord } from '../src/lib/types'

const item = (id: string): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1 })
const rec = (id: string, itemId: string, ts = 1): ItemRecord => ({ id, itemId, ts, note: '' })

let db: LastTimeDB
let n = 0
beforeEach(() => {
  db = createDb(`test-${n++}`)
})

describe('db', () => {
  it('starts empty', async () => {
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
  it('puts and loads items and records', async () => {
    await putItem(db, item('a'))
    await putRecord(db, rec('r1', 'a'))
    await putRecords(db, [rec('r2', 'a', 2), rec('r3', 'a', 3)])
    const all = await loadAll(db)
    expect(all.items).toHaveLength(1)
    expect(all.records.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3'])
  })
  it('putItem overwrites by id', async () => {
    await putItem(db, item('a'))
    await putItem(db, { ...item('a'), name: 'renamed' })
    expect((await loadAll(db)).items).toEqual([{ ...item('a'), name: 'renamed' }])
  })
  it('deleteItemCascade removes its records only', async () => {
    await addMany(db, [item('a'), item('b')], [rec('r1', 'a'), rec('r2', 'b')])
    await deleteItemCascade(db, 'a')
    const all = await loadAll(db)
    expect(all.items.map((i) => i.id)).toEqual(['b'])
    expect(all.records.map((r) => r.id)).toEqual(['r2'])
  })
  it('deleteRecord', async () => {
    await addMany(db, [item('a')], [rec('r1', 'a'), rec('r2', 'a')])
    await deleteRecord(db, 'r1')
    expect((await loadAll(db)).records.map((r) => r.id)).toEqual(['r2'])
  })
  it('replaceAll wipes then writes', async () => {
    await addMany(db, [item('old')], [rec('r0', 'old')])
    await replaceAll(db, [item('new')], [rec('r9', 'new')])
    const all = await loadAll(db)
    expect(all.items.map((i) => i.id)).toEqual(['new'])
    expect(all.records.map((r) => r.id)).toEqual(['r9'])
  })
  it('clearAll', async () => {
    await addMany(db, [item('a')], [rec('r1', 'a')])
    await clearAll(db)
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
})
