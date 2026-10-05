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
  constructor() { super('time is in the future') }
}
export class EmptyNameError extends Error {
  constructor() { super('name is empty') }
}
export class NotFoundError extends Error {
  constructor(what: string) { super(`${what} not found`) }
}

export interface LogResult {
  record: ItemRecord
  item: Item
  itemCreated: boolean
}

const FUTURE_SLACK_MS = 60_000

export class Store {
  items = $state.raw<Item[]>([])
  records = $state.raw<ItemRecord[]>([])
  settings = $state.raw<Settings>({ ...DEFAULT_SETTINGS })
  ready = $state.raw(false)
  now = $state.raw(0)

  readonly lastTs = $derived(lastTsByItem(this.records))

  constructor(
    private readonly db: LastTimeDB,
    private readonly storage?: KeyValueStorage,
    private readonly clock: () => number = Date.now,
  ) {
    this.now = clock()
  }

  async init(): Promise<void> {
    this.settings = loadSettings(this.storage)
    await this.reload()
    this.ready = true
  }

  private async reload(): Promise<void> {
    const all = await loadAll(this.db)
    this.items = all.items
    this.records = all.records
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
   * Apply an in-memory change, then persist. On failure restore the pre-change
   * snapshot, best-effort reload from the DB, and rethrow the original error.
   */
  private async commit(mutate: () => void, persist: () => Promise<void>): Promise<void> {
    const snapshot = { items: this.items, records: this.records }
    mutate()
    try {
      await persist()
    } catch (e) {
      this.items = snapshot.items
      this.records = snapshot.records
      try {
        await this.reload()
      } catch {
        // DB unreadable too: keep the restored snapshot, surface the original error
      }
      throw e
    }
  }

  private assertNotFuture(ts: number): void {
    if (ts > this.clock() + FUTURE_SLACK_MS) throw new FutureTimeError()
  }

  async addItemAndLog(rawName: string, ts: number = this.clock()): Promise<LogResult> {
    const name = normalizeName(rawName)
    if (!name) throw new EmptyNameError()
    const existing = this.findByName(name)
    if (existing) {
      // Logging onto an archived item brings it back so the record shows on the home list.
      if (existing.archived) await this.updateItem(existing.id, { archived: false })
      return this.logNow(existing.id, ts)
    }

    const item: Item = { id: nextId(this.clock()), name, emoji: guessEmoji(name), expectDays: null, archived: false, created: ts }
    const record: ItemRecord = { id: nextId(this.clock()), itemId: item.id, ts, note: '' }
    await this.commit(
      () => {
        this.items = [...this.items, item]
        this.records = [...this.records, record]
      },
      () => addMany(this.db, [item], [record]),
    )
    return { record, item, itemCreated: true }
  }

  async logNow(itemId: string, ts: number = this.clock()): Promise<LogResult> {
    const item = this.itemById(itemId)
    if (!item) throw new NotFoundError('item')
    const record = await this.addRecord(itemId, ts)
    return { record, item, itemCreated: false }
  }

  async addRecord(itemId: string, ts: number, note = ''): Promise<ItemRecord> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    this.assertNotFuture(ts)
    const record: ItemRecord = { id: nextId(this.clock()), itemId, ts, note }
    await this.commit(
      () => { this.records = [...this.records, record] },
      () => putRecord(this.db, record),
    )
    return record
  }

  async addRecords(itemId: string, tss: number[], note = ''): Promise<ItemRecord[]> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    tss.forEach((ts) => this.assertNotFuture(ts))
    // nextId() bumps past the previous id, so a batch minted in one millisecond stays unique and ordered.
    const rs: ItemRecord[] = tss.map((ts) => ({ id: nextId(this.clock()), itemId, ts, note }))
    await this.commit(
      () => { this.records = [...this.records, ...rs] },
      () => putRecords(this.db, rs),
    )
    return rs
  }

  async updateRecord(id: string, patch: { ts?: number; note?: string }): Promise<void> {
    const cur = this.recordById(id)
    if (!cur) throw new NotFoundError('record')
    if (patch.ts !== undefined) this.assertNotFuture(patch.ts)
    const next: ItemRecord = { ...cur, ...(patch.ts !== undefined ? { ts: patch.ts } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) }
    await this.commit(
      () => { this.records = this.records.map((r) => (r.id === id ? next : r)) },
      () => putRecord(this.db, next),
    )
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.recordById(id)) return
    await this.commit(
      () => { this.records = this.records.filter((r) => r.id !== id) },
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
      next.name = name
    }
    if (patch.emoji !== undefined && patch.emoji.trim()) next.emoji = patch.emoji.trim()
    if ('expectDays' in patch) next.expectDays = normalizeExpectDays(patch.expectDays)
    if (patch.archived !== undefined) next.archived = patch.archived
    await this.commit(
      () => { this.items = this.items.map((i) => (i.id === id ? next : i)) },
      () => putItem(this.db, next),
    )
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.itemById(id)) return
    await this.commit(
      () => {
        this.items = this.items.filter((i) => i.id !== id)
        this.records = this.records.filter((r) => r.itemId !== id)
      },
      () => deleteItemCascade(this.db, id),
    )
  }

  async undoLog(result: LogResult): Promise<void> {
    if (this.recordById(result.record.id)) await this.deleteRecord(result.record.id)
    if (result.itemCreated && this.itemById(result.item.id) && this.recordsOf(result.item.id).length === 0) {
      await this.deleteItem(result.item.id)
    }
  }

  async mergeIn(items: Item[], records: ItemRecord[]): Promise<void> {
    await this.commit(
      () => {
        this.items = [...this.items, ...items]
        this.records = [...this.records, ...records]
      },
      () => addMany(this.db, items, records),
    )
  }

  async replaceWith(items: Item[], records: ItemRecord[]): Promise<void> {
    await this.commit(
      () => {
        this.items = items
        this.records = records
      },
      () => replaceAll(this.db, items, records),
    )
  }

  async clearAllData(): Promise<void> {
    await this.commit(
      () => {
        this.items = []
        this.records = []
      },
      () => clearAll(this.db),
    )
    this.updateSettings({ lastBackupAt: null, backupSnoozeUntil: null })
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    saveSettings(this.settings, this.storage)
  }
}
