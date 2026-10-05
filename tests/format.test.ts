import { describe, it, expect } from 'vitest'
import {
  formatTime, formatMonthDay, formatShort, formatLong, formatBackupFileName,
  toDatetimeLocalValue, fromDatetimeLocalValue, toDateKey,
} from '../src/lib/format'

const ts = new Date(2026, 8, 20, 14, 32).getTime() // 2026-09-20 is a Sunday

describe('format', () => {
  it('time', () => expect(formatTime(ts)).toBe('14:32'))
  it('month day', () => expect(formatMonthDay(ts)).toBe('9月20日'))
  it('short', () => expect(formatShort(ts)).toBe('9月20日 14:32'))
  it('long with weekday', () => expect(formatLong(ts)).toBe('2026年9月20日 週日 14:32'))
  it('pads single digits in time only', () => {
    expect(formatShort(new Date(2026, 0, 5, 9, 7).getTime())).toBe('1月5日 09:07')
  })
  it('backup file name', () => {
    expect(formatBackupFileName(new Date(2026, 9, 5, 9).getTime())).toBe('上次備份-2026-10-05.json')
  })
  it('datetime-local round trip', () => {
    expect(toDatetimeLocalValue(ts)).toBe('2026-09-20T14:32')
    expect(fromDatetimeLocalValue('2026-09-20T14:32')).toBe(ts)
    expect(fromDatetimeLocalValue('')).toBeNull()
    expect(fromDatetimeLocalValue('garbage')).toBeNull()
  })
  it('date key', () => expect(toDateKey(ts)).toBe('2026-09-20'))
})
