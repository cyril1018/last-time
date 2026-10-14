import { describe, it, expect } from 'vitest'
import {
  formatTime, formatClock, formatMonthDay, formatShort, formatLong, formatBackupFileName,
  toDatetimeLocalValue, fromDatetimeLocalValue, toDateKey,
} from '../src/lib/format'

const ts = new Date(2026, 8, 20, 14, 32).getTime() // 2026-09-20 is a Sunday

describe('format', () => {
  it('time', () => expect(formatTime(ts)).toBe('14:32'))
  it('month day', () => expect(formatMonthDay(ts, 'zh-TW')).toBe('9月20日'))
  it('short', () => expect(formatShort(ts, 'zh-TW')).toBe('9月20日 14:32'))
  it('long with weekday', () => expect(formatLong(ts, 'zh-TW')).toBe('2026年9月20日 週日 14:32'))
  it('pads single digits in time only', () => {
    expect(formatShort(new Date(2026, 0, 5, 9, 7).getTime(), 'zh-TW')).toBe('1月5日 09:07')
  })
  it('backup file name', () => {
    expect(formatBackupFileName(new Date(2026, 9, 5, 9).getTime(), 'zh-TW')).toBe('上次備份-2026-10-05.json')
  })
  it('datetime-local round trip', () => {
    expect(toDatetimeLocalValue(ts)).toBe('2026-09-20T14:32')
    expect(fromDatetimeLocalValue('2026-09-20T14:32')).toBe(ts)
    expect(fromDatetimeLocalValue('')).toBeNull()
    expect(fromDatetimeLocalValue('garbage')).toBeNull()
  })
  it('date key', () => expect(toDateKey(ts)).toBe('2026-09-20'))
  it('date key zero-pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5, 9).getTime())).toBe('2026-01-05')
  })
  it.each([
    '2026-02-31T10:00', '2026-02-29T10:00', '2026-13-01T10:00', '2026-00-10T10:00', '2026-04-31T10:00',
    '2026-09-20T24:00', '2026-09-20T23:60', '0026-09-20T10:00',
  ])('rejects %s, whose components do not round-trip', (v) => {
    expect(fromDatetimeLocalValue(v)).toBeNull()
  })
  it('accepts real edge dates', () => {
    expect(fromDatetimeLocalValue('2028-02-29T00:00')).toBe(new Date(2028, 1, 29, 0, 0).getTime())
    expect(fromDatetimeLocalValue('2026-12-31T23:59')).toBe(new Date(2026, 11, 31, 23, 59).getTime())
  })
})

describe('English formatting', () => {
  const ts = new Date(2026, 8, 20, 14, 32).getTime()
  const morning = new Date(2026, 0, 5, 9, 7).getTime()
  it('en-US uses a 12-hour clock', () => {
    expect(formatMonthDay(ts, 'en-US')).toBe('Sep 20')
    expect(formatShort(ts, 'en-US')).toBe('Sep 20, 2:32 PM')
    expect(formatShort(morning, 'en-US')).toBe('Jan 5, 9:07 AM')
    expect(formatLong(ts, 'en-US')).toBe('Sun, Sep 20, 2026, 2:32 PM')
    expect(formatClock(ts, 'en-US')).toBe('2:32 PM')
  })
  it('en-GB keeps a 24-hour clock', () => {
    expect(formatClock(ts, 'en-GB')).toBe('14:32')
    expect(formatShort(ts, 'en-GB')).toContain('14:32')
    expect(formatLong(ts, 'en-GB')).toContain('2026')
    expect(formatLong(ts, 'en-GB')).not.toMatch(/PM/i)
  })
  it('never emits narrow or no-break spaces (stable across ICU versions)', () => {
    for (const out of [formatShort(ts, 'en-US'), formatLong(ts, 'en-US'), formatClock(ts, 'en-US')]) {
      expect(out).not.toMatch(/[  ]/)
    }
  })
  it('Chinese formatClock is the 24-hour formatTime', () => {
    expect(formatClock(morning, 'zh-TW')).toBe('09:07')
  })
  it('English backup file name', () => {
    expect(formatBackupFileName(new Date(2026, 9, 5, 9).getTime(), 'en')).toBe('last-time-backup-2026-10-05.json')
  })
})
