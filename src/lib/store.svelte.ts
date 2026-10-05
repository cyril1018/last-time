import {
  loadAll, putItem, deleteItemCascade, putRecord, putRecords, deleteRecord as dbDeleteRecord,
  addMany, replaceAll, clearAll, type LastTimeDB,
} from './db'
import { loadSettings, saveSettings, type KeyValueStorage } from './settings'
import { nextId } from './ids'
import { guessEmoji } from './emoji'
import { normalizeName, normalizeExpectDays, lastTsByItem } from './calc'
import { DEFAULT_SETTINGS, type Item, type ItemRecord, type Settings } from './types'

export class FutureTimeError extends Error {
  constructor() { super('time is in the future'); this.name = 'FutureTimeError' }
}
export class InvalidTimeError extends Error {
  constructor() { super('time is not a finite number'); this.name = 'InvalidTimeError' }
}
export class EmptyNameError extends Error {
  constructor() { super('name is empty'); this.name = 'EmptyNameError' }
}
export class DuplicateNameError extends Error {
  constructor() { super('another item already has this name'); this.name = 'DuplicateNameError' }
}
export class NotFoundError extends Error {
  constructor(what: string) { super(`${what} not found`); this.name = 'NotFoundError' }
}

export interface LogResult {
  record: ItemRecord
  item: Item
  itemCreated: boolean
  /** The log brought an archived item back; undo archives it again. */
  itemUnarchived: boolean
}

interface Data {
  items: Item[]
  records: ItemRecord[]
}

/** Last occurrence of each id wins, like a bulkPut of the same list. */
function dedupeById<T extends { id: string }>(xs: readonly T[]): T[] {
  return [...new Map(xs.map((x) => [x.id, x] as const)).values()]
}

/** Insert or replace by id, like a bulkPut onto an existing table. */
function upsertById<T extends { id: string }>(cur: readonly T[], incoming: readonly T[]): T[] {
  const add = dedupeById(incoming)
  const ids = new Set(add.map((x) => x.id))
  return [...cur.filter((x) => !ids.has(x.id)), ...add]
}

const FUTURE_SLACK_MS = 60_000

export class Store {
  items = $state.raw<Item[]>([])
  records = $state.raw<ItemRecord[]>([])
  settings = $state.raw<Settings>({ ...DEFAULT_SETTINGS })
  ready = $state.raw(false)
  now = $state.raw(0)

  readonly lastTs = $derived(lastTsByItem(this.records))

  /** Persists run one at a time, in mutation order. */
  private queue: Promise<unknown> = Promise.resolve()
  /** Commits whose persist has not settled yet. */
  private inFlight = 0
  /** Bumped by every commit; lets a resync detect that memory moved on while it was reading. */
  private commitSeq = 0
  /** A persist failed: memory holds a change the DB does not. */
  private needsResync = false
  /** What the DB holds as far as this store knows: the last load plus every persist that succeeded. */
  private persisted: Data = { items: [], records: [] }

  constructor(
    private readonly db: LastTimeDB,
    private readonly storage?: KeyValueStorage,
    private readonly clock: () => number = Date.now,
  ) {
    this.now = clock()
  }

  async init(): Promise<void> {
    this.settings = loadSettings(this.storage)
    this.apply(await loadAll(this.db))
    this.ready = true
  }

  private apply(data: Data): void {
    this.items = data.items
    this.records = data.records
    this.persisted = data
  }

  tick(): void {
    this.now = this.clock()
  }

  // ---- queries ----

  itemById(id: string): Item | undefined {
    return this.items.find((i) => i.id === id)
  }

  recordById(id: string): ItemRecord | undefined {
    return this.records.find((r) => r.id === id)
  }

  recordsOf(itemId: string): ItemRecord[] {
    return this.records.filter((r) => r.itemId === itemId).sort((a, b) => b.ts - a.ts)
  }

  findByName(raw: string): Item | undefined {
    const name = normalizeName(raw)
    if (!name) return undefined
    return this.items.find((i) => i.name === name)
  }

  // ---- mutations ----

  /**
   * Apply `change` to memory at once (optimistic), then queue its persist behind any earlier ones.
   * A failed persist rethrows its original error; once no persist is in flight, memory is rebuilt from
   * the DB (or, if the DB cannot be read, from the record of what was persisted), so a later mutation
   * that did persist is never wiped from memory by an earlier one's rollback.
   */
  private async commit(change: (d: Data) => Data, persist: () => Promise<void>): Promise<void> {
    const next = change({ items: this.items, records: this.records })
    this.items = next.items
    this.records = next.records
    this.commitSeq++
    this.inFlight++
    const run = this.queue.then(persist)
    this.queue = run.catch(() => {})
    try {
      await run
      this.persisted = change(this.persisted)
    } catch (e) {
      this.needsResync = true
      throw e
    } finally {
      if (--this.inFlight === 0 && this.needsResync) await this.resync()
    }
  }

  /** Never throws: it runs inside commit's `finally`, where an error would replace the original one. */
  private async resync(): Promise<void> {
    this.needsResync = false
    for (;;) {
      const seq = this.commitSeq
      let fresh = this.persisted
      try {
        fresh = await loadAll(this.db)
      } catch {
        // DB unreadable: fall back to what this store knows it persisted
      }
      if (this.commitSeq === seq) {
        this.apply(fresh)
        return
      }
      // A newer commit changed memory while we read. If it is still in flight it resyncs when it settles;
      // if it already settled (it saw needsResync false), read again.
      if (this.inFlight > 0) {
        this.needsResync = true
        return
      }
    }
  }

  private assertValidTs(ts: number): void {
    if (!Number.isFinite(ts)) throw new InvalidTimeError()
    if (ts > this.clock() + FUTURE_SLACK_MS) throw new FutureTimeError()
  }

  async addItemAndLog(rawName: string, ts: number = this.clock()): Promise<LogResult> {
    const name = normalizeName(rawName)
    if (!name) throw new EmptyNameError()
    this.assertValidTs(ts)
    const existing = this.findByName(name)
    if (existing && !existing.archived) return this.logNow(existing.id, ts)

    if (existing) {
      // Logging onto an archived item brings it back so the record shows on the home list.
      // One transaction: the item never ends up unarchived without its record, or the reverse.
      const item: Item = { ...existing, archived: false }
      const record: ItemRecord = { id: nextId(this.clock()), itemId: item.id, ts, note: '' }
      await this.commit(
        (d) => ({ items: d.items.map((i) => (i.id === item.id ? item : i)), records: [...d.records, record] }),
        () => addMany(this.db, [item], [record]),
      )
      return { record, item, itemCreated: false, itemUnarchived: true }
    }

    const item: Item = { id: nextId(this.clock()), name, emoji: guessEmoji(name), expectDays: null, archived: false, created: ts }
    const record: ItemRecord = { id: nextId(this.clock()), itemId: item.id, ts, note: '' }
    await this.commit(
      (d) => ({ items: [...d.items, item], records: [...d.records, record] }),
      () => addMany(this.db, [item], [record]),
    )
    return { record, item, itemCreated: true, itemUnarchived: false }
  }

  async logNow(itemId: string, ts: number = this.clock()): Promise<LogResult> {
    const item = this.itemById(itemId)
    if (!item) throw new NotFoundError('item')
    const record = await this.addRecord(itemId, ts)
    return { record, item, itemCreated: false, itemUnarchived: false }
  }

  async addRecord(itemId: string, ts: number, note = ''): Promise<ItemRecord> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    this.assertValidTs(ts)
    const record: ItemRecord = { id: nextId(this.clock()), itemId, ts, note }
    await this.commit(
      (d) => ({ ...d, records: [...d.records, record] }),
      () => putRecord(this.db, record),
    )
    return record
  }

  async addRecords(itemId: string, tss: number[], note = ''): Promise<ItemRecord[]> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    tss.forEach((ts) => this.assertValidTs(ts))
    // nextId() bumps past the previous id, so a batch minted in one millisecond stays unique and ordered.
    const rs: ItemRecord[] = tss.map((ts) => ({ id: nextId(this.clock()), itemId, ts, note }))
    await this.commit(
      (d) => ({ ...d, records: [...d.records, ...rs] }),
      () => putRecords(this.db, rs),
    )
    return rs
  }

  async updateRecord(id: string, patch: { ts?: number; note?: string }): Promise<void> {
    const cur = this.recordById(id)
    if (!cur) throw new NotFoundError('record')
    if (patch.ts !== undefined) this.assertValidTs(patch.ts)
    const next: ItemRecord = { ...cur, ...(patch.ts !== undefined ? { ts: patch.ts } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) }
    await this.commit(
      (d) => ({ ...d, records: d.records.map((r) => (r.id === id ? next : r)) }),
      () => putRecord(this.db, next),
    )
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.recordById(id)) return
    await this.commit(
      (d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }),
      () => dbDeleteRecord(this.db, id),
    )
  }

  async updateItem(id: string, patch: { name?: string; emoji?: string; expectDays?: unknown; archived?: boolean }): Promise<void> {
    const cur = this.itemById(id)
    if (!cur) throw new NotFoundError('item')
    const next: Item = { ...cur }
    if (patch.name !== undefined) {
      const name = normalizeName(patch.name)
      if (!name) throw new EmptyNameError()
      // Only a real rename is checked, so an item that already shares a name (e.g. from a merged backup)
      // can still be saved with other edits.
      if (name !== normalizeName(cur.name) && this.items.some((i) => i.id !== id && normalizeName(i.name) === name)) {
        throw new DuplicateNameError()
      }
      next.name = name
    }
    if (patch.emoji !== undefined && patch.emoji.trim()) next.emoji = patch.emoji.trim()
    if ('expectDays' in patch) next.expectDays = normalizeExpectDays(patch.expectDays)
    if (patch.archived !== undefined) next.archived = patch.archived
    await this.commit(
      (d) => ({ ...d, items: d.items.map((i) => (i.id === id ? next : i)) }),
      () => putItem(this.db, next),
    )
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.itemById(id)) return
    await this.commit(
      (d) => ({ items: d.items.filter((i) => i.id !== id), records: d.records.filter((r) => r.itemId !== id) }),
      () => deleteItemCascade(this.db, id),
    )
  }

  async undoLog(result: LogResult): Promise<void> {
    if (this.recordById(result.record.id)) await this.deleteRecord(result.record.id)
    if (result.itemCreated && this.itemById(result.item.id) && this.recordsOf(result.item.id).length === 0) {
      await this.deleteItem(result.item.id)
    } else if (result.itemUnarchived && this.itemById(result.item.id)?.archived === false) {
      await this.updateItem(result.item.id, { archived: true })
    }
  }

  /** Adds or overwrites by id; duplicated ids in the input collapse to the last one, as in the DB. */
  async mergeIn(items: Item[], records: ItemRecord[]): Promise<void> {
    const is = dedupeById(items)
    const rs = dedupeById(records)
    await this.commit(
      (d) => ({ items: upsertById(d.items, is), records: upsertById(d.records, rs) }),
      () => addMany(this.db, is, rs),
    )
  }

  async replaceWith(items: Item[], records: ItemRecord[]): Promise<void> {
    const is = dedupeById(items)
    const rs = dedupeById(records)
    await this.commit(
      () => ({ items: is, records: rs }),
      () => replaceAll(this.db, is, rs),
    )
  }

  /** Spec §7.6: wipe all data and reset every setting except theme and vibrate. */
  async clearAllData(): Promise<void> {
    await this.commit(
      () => ({ items: [], records: [] }),
      () => clearAll(this.db),
    )
    this.updateSettings({ ...DEFAULT_SETTINGS, theme: this.settings.theme, vibrate: this.settings.vibrate })
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    saveSettings(this.settings, this.storage)
  }
}
