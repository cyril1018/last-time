import { startOfDay } from './calc'
import { toDateKey } from './format'

export interface MonthCell {
  key: string
  day: number
  ts: number
  inMonth: boolean
  future: boolean
  today: boolean
}

/** 6 rows × 7 columns, weeks start on Monday. */
export function monthGrid(year: number, month0: number, todayTs: number): MonthCell[] {
  const first = new Date(year, month0, 1)
  const offset = (first.getDay() + 6) % 7 // Mon=0 … Sun=6
  const todayStart = startOfDay(todayTs)
  const cells: MonthCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month0, 1 - offset + i)
    const ts = d.getTime()
    cells.push({
      key: toDateKey(ts),
      day: d.getDate(),
      ts,
      inMonth: d.getMonth() === month0,
      future: ts > todayStart,
      today: ts === todayStart,
    })
  }
  return cells
}

export function monthLabel(year: number, month0: number): string {
  return `${year} 年 ${month0 + 1} 月`
}

export function combineDateTime(dayTs: number, hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  const d = new Date(dayTs)
  d.setHours(h, mi, 0, 0)
  return d.getTime()
}

/**
 * Day keys from a restored draft that can still be selected: well-formed, and today or earlier. A day that
 * has become future since the draft was saved is disabled in the calendar, so the user could not deselect it.
 */
export function pastOrTodayKeys(keys: readonly string[], todayTs: number): string[] {
  const today = toDateKey(todayTs)
  return keys.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= today)
}
