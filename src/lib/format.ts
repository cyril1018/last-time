import type { Locale } from './types'
import { messagesFor } from './i18n/messages'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const
const pad = (n: number) => String(n).padStart(2, '0')
const isZh = (dateLocale: string) => /^zh/i.test(dateLocale)

/** Intl output with narrow/no-break spaces folded to plain spaces, so the text is the same on every ICU. */
function intl(ts: number, dateLocale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(dateLocale, opts).format(new Date(ts)).replace(/[\u202f\u00a0]/g, ' ')
}
const MONTH_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
const CLOCK: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }

/** Fixed 24-hour HH:MM: what <input type="datetime-local"> needs. For display use formatClock. */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatClock(ts: number, dateLocale: string): string {
  return isZh(dateLocale) ? formatTime(ts) : intl(ts, dateLocale, CLOCK)
}

export function formatMonthDay(ts: number, dateLocale: string): string {
  if (!isZh(dateLocale)) return intl(ts, dateLocale, MONTH_DAY)
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatShort(ts: number, dateLocale: string): string {
  if (!isZh(dateLocale)) return intl(ts, dateLocale, { ...MONTH_DAY, ...CLOCK })
  return `${formatMonthDay(ts, dateLocale)} ${formatTime(ts)}`
}

export function formatLong(ts: number, dateLocale: string): string {
  if (!isZh(dateLocale)) return intl(ts, dateLocale, { weekday: 'short', year: 'numeric', ...MONTH_DAY, ...CLOCK })
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]} ${formatTime(ts)}`
}

export function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatBackupFileName(now: number, locale: Locale): string {
  return `${messagesFor(locale).backup.filePrefix}-${toDateKey(now)}.json`
}

export function toDatetimeLocalValue(ts: number): string {
  return `${toDateKey(ts)}T${formatTime(ts)}`
}

export function fromDatetimeLocalValue(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number]
  const date = new Date(y, mo - 1, d, h, mi)
  // Date silently rolls over out-of-range parts (Feb 31 → Mar 3, 24:00 → next day): reject those.
  const roundTrips =
    date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d &&
    date.getHours() === h && date.getMinutes() === mi
  return roundTrips ? date.getTime() : null
}
