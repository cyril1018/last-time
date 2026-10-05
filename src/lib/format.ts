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
  const [, y, mo, d, h, mi] = m
  const t = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)).getTime()
  return Number.isFinite(t) ? t : null
}
