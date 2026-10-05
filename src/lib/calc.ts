import type { Item, ItemRecord } from './types'

export const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const BACKUP_STALE_DAYS = 14
const BACKUP_MIN_RECORDS = 5

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole calendar days from `earlier` to `later` in the device time zone. Robust to DST (rounds). */
export function calendarDaysBetween(earlier: number, later: number): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / DAY_MS)
}

export type SinceKind = 'now' | 'hours' | 'days'
export interface Since {
  kind: SinceKind
  /** Hours for 'hours', days for 'days', 0 for 'now'. */
  value: number
  /** Calendar-day difference, always present. */
  days: number
}

export function since(ts: number, now: number): Since {
  const days = Math.max(0, calendarDaysBetween(ts, now))
  const elapsed = now - ts
  if (elapsed < HOUR_MS) return { kind: 'now', value: 0, days: 0 }
  if (days === 0) return { kind: 'hours', value: Math.floor(elapsed / HOUR_MS), days: 0 }
  return { kind: 'days', value: days, days }
}

export function sinceParts(s: Since): { number: string; unit: string } {
  if (s.kind === 'now') return { number: '剛剛', unit: '' }
  if (s.kind === 'hours') return { number: String(s.value), unit: '小時' }
  return { number: String(s.value), unit: '天' }
}

export function numberStyle(s: Since): { fontSizePx: number; fontWeight: number } {
  if (s.kind !== 'days') return { fontSizePx: 18, fontWeight: 420 }
  const fontSizePx = Math.min(44, 22 + 6 * Math.log2(s.days + 1))
  const fontWeight = Math.min(680, 420 + s.days * 4)
  return { fontSizePx, fontWeight }
}

export function isDue(expectDays: number | null, s: Since): boolean {
  return expectDays !== null && s.kind === 'days' && s.days >= expectDays
}

/** Positive integer or null. Accepts numbers and numeric strings. */
export function normalizeExpectDays(input: unknown): number | null {
  let n: number
  if (typeof input === 'number') n = input
  else if (typeof input === 'string' && input.trim() !== '') n = Number(input.trim())
  else return null
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null
  return n
}

export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function lastTsByItem(records: ItemRecord[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of records) {
    const cur = m.get(r.itemId)
    if (cur === undefined || r.ts > cur) m.set(r.itemId, r.ts)
  }
  return m
}

export function sortItemsForHome(items: Item[], lastTs: Map<string, number>): Item[] {
  return items
    .filter((i) => !i.archived)
    .slice()
    .sort((a, b) => {
      const ta = lastTs.get(a.id)
      const tb = lastTs.get(b.id)
      if (ta === undefined && tb === undefined) return a.created - b.created
      if (ta === undefined) return 1
      if (tb === undefined) return -1
      return tb - ta
    })
}

export function recent7(items: Item[], lastTs: Map<string, number>, now: number): { done: number; total: number } {
  const active = items.filter((i) => !i.archived)
  const cutoff = now - 7 * DAY_MS
  const done = active.filter((i) => (lastTs.get(i.id) ?? -Infinity) > cutoff).length
  return { done, total: active.length }
}

export function averageIntervalDays(tss: number[]): number | null {
  if (tss.length < 3) return null
  const min = Math.min(...tss)
  const max = Math.max(...tss)
  return (max - min) / (tss.length - 1) / DAY_MS
}

export function formatIntervalDays(days: number): string {
  return days < 10 ? days.toFixed(1) : String(Math.round(days))
}

/** For a newest-first timestamp list, gap in calendar days between each adjacent pair. */
export function gapsBetween(tssDesc: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < tssDesc.length - 1; i++) {
    out.push(calendarDaysBetween(tssDesc[i + 1]!, tssDesc[i]!))
  }
  return out
}

export function backupBannerVisible(
  recordCount: number,
  s: { lastBackupAt: number | null; backupSnoozeUntil: number | null },
  now: number,
): boolean {
  if (recordCount < BACKUP_MIN_RECORDS) return false
  if (s.backupSnoozeUntil !== null && now <= s.backupSnoozeUntil) return false
  if (s.lastBackupAt === null) return true
  return now - s.lastBackupAt > BACKUP_STALE_DAYS * DAY_MS
}
