import Dexie, { type Table } from 'dexie'
import type { Item, ItemRecord } from './types'

export class LastTimeDB extends Dexie {
  items!: Table<Item, string>
  records!: Table<ItemRecord, string>

  constructor(name = 'lasttime') {
    super(name)
    this.version(1).stores({
      items: 'id',
      records: 'id, itemId, ts',
    })
  }
}

export function createDb(name?: string): LastTimeDB {
  return new LastTimeDB(name)
}

/** Both tables from one read transaction, so the pair is a consistent snapshot. */
export async function loadAll(db: LastTimeDB): Promise<{ items: Item[]; records: ItemRecord[] }> {
  return db.transaction('r', db.items, db.records, async () => {
    const [items, records] = await Promise.all([db.items.toArray(), db.records.toArray()])
    return { items, records }
  })
}

export async function putItem(db: LastTimeDB, item: Item): Promise<void> {
  await db.items.put(item)
}

export async function deleteItemCascade(db: LastTimeDB, itemId: string): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.records.where('itemId').equals(itemId).delete()
    await db.items.delete(itemId)
  })
}

export async function putRecord(db: LastTimeDB, r: ItemRecord): Promise<void> {
  await db.records.put(r)
}

export async function putRecords(db: LastTimeDB, rs: ItemRecord[]): Promise<void> {
  await db.records.bulkPut(rs)
}

export async function deleteRecord(db: LastTimeDB, id: string): Promise<void> {
  await db.records.delete(id)
}

export async function addMany(db: LastTimeDB, items: Item[], records: ItemRecord[]): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.bulkPut(items)
    await db.records.bulkPut(records)
  })
}

export async function replaceAll(db: LastTimeDB, items: Item[], records: ItemRecord[]): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.clear()
    await db.records.clear()
    await db.items.bulkPut(items)
    await db.records.bulkPut(records)
  })
}

export async function clearAll(db: LastTimeDB): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.clear()
    await db.records.clear()
  })
}
