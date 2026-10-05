import type { Item, ItemRecord, Settings, Theme } from './types'
import { normalizeExpectDays, normalizeName } from './calc'
import { DEFAULT_EMOJI } from './emoji'
import { dedupeById } from './collections'

export const BACKUP_APP = 'lasttime'
export const BACKUP_VERSION = 1
/** Name given to an imported item whose name is empty; dropping it would lose its records. */
export const UNNAMED_ITEM = '未命名'

export interface ParsedBackup {
  exportedAt: string | null
  items: Item[]
  records: ItemRecord[]
  orphanRecords: ItemRecord[]
  settings: { theme?: Theme; vibrate?: boolean }
}

export type ParseResult =
  | { ok: true; backup: ParsedBackup }
  | { ok: false; reason: 'invalid-json' | 'not-lasttime' }

export function serializeBackup(items: Item[], records: ItemRecord[], settings: Settings, now: number): string {
  const payload = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    items: items.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji, expectDays: i.expectDays, archived: i.archived, created: i.created })),
    records: records.map((r) => ({ id: r.id, itemId: r.itemId, ts: r.ts, note: r.note })),
    settings: { theme: settings.theme, vibrate: settings.vibrate },
  }
  return JSON.stringify(payload, null, 2)
}

const THEMES: readonly Theme[] = ['system', 'light', 'dark']
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function toItem(raw: unknown): Item | null {
  if (!isObj(raw)) return null
  if (!nonEmptyString(raw['id']) || typeof raw['name'] !== 'string' || !finite(raw['created'])) return null
  const emoji = typeof raw['emoji'] === 'string' ? raw['emoji'].trim() : ''
  return {
    id: raw['id'],
    name: normalizeName(raw['name']) || UNNAMED_ITEM,
    emoji: emoji || DEFAULT_EMOJI,
    expectDays: normalizeExpectDays(raw['expectDays']),
    archived: raw['archived'] === true,
    created: raw['created'],
  }
}

function toRecord(raw: unknown): ItemRecord | null {
  if (!isObj(raw)) return null
  if (!nonEmptyString(raw['id']) || !nonEmptyString(raw['itemId']) || !finite(raw['ts'])) return null
  return { id: raw['id'], itemId: raw['itemId'], ts: raw['ts'], note: typeof raw['note'] === 'string' ? raw['note'] : '' }
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }
  if (!isObj(raw) || raw['app'] !== BACKUP_APP || !Array.isArray(raw['items'])) {
    return { ok: false, reason: 'not-lasttime' }
  }
  // Duplicate ids would otherwise inflate the summary counts beyond what the import actually stores.
  const items = dedupeById(raw['items'].map(toItem).filter((i): i is Item => i !== null))
  const itemIds = new Set(items.map((i) => i.id))
  const allRecords = dedupeById(
    (Array.isArray(raw['records']) ? raw['records'] : []).map(toRecord).filter((r): r is ItemRecord => r !== null),
  )
  const records = allRecords.filter((r) => itemIds.has(r.itemId))
  const orphanRecords = allRecords.filter((r) => !itemIds.has(r.itemId))

  const settings: ParsedBackup['settings'] = {}
  if (isObj(raw['settings'])) {
    const s = raw['settings']
    if (THEMES.includes(s['theme'] as Theme)) settings.theme = s['theme'] as Theme
    if (typeof s['vibrate'] === 'boolean') settings.vibrate = s['vibrate']
  }

  return {
    ok: true,
    backup: {
      exportedAt: typeof raw['exportedAt'] === 'string' ? raw['exportedAt'] : null,
      items,
      records,
      orphanRecords,
      settings,
    },
  }
}

export function summarize(b: ParsedBackup): { exportedAt: string | null; itemCount: number; recordCount: number } {
  return { exportedAt: b.exportedAt, itemCount: b.items.length, recordCount: b.records.length }
}

export function planMerge(
  existing: { items: Item[]; records: ItemRecord[] },
  b: ParsedBackup,
): { items: Item[]; records: ItemRecord[] } {
  const haveItem = new Set(existing.items.map((i) => i.id))
  const haveRec = new Set(existing.records.map((r) => r.id))
  const items = b.items.filter((i) => !haveItem.has(i.id))
  const knownItems = new Set([...haveItem, ...items.map((i) => i.id)])
  const records = [...b.records, ...b.orphanRecords].filter((r) => !haveRec.has(r.id) && knownItems.has(r.itemId))
  return { items, records }
}

export function planReplace(b: ParsedBackup): { items: Item[]; records: ItemRecord[] } {
  return { items: b.items, records: b.records }
}
