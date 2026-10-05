const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const
const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatMonthDay(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatShort(ts: number): string {
  return `${formatMonthDay(ts)} ${formatTime(ts)}`
}

export function formatLong(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]} ${formatTime(ts)}`
}

export function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatBackupFileName(now: number): string {
  return `上次備份-${toDateKey(now)}.json`
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
