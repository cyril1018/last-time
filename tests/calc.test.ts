import { describe, it, expect } from 'vitest'
import {
  startOfDay, calendarDaysBetween, since, sinceParts, numberStyle, isDue,
  normalizeExpectDays, normalizeName, lastTsByItem, sortItemsForHome, recent7,
  averageIntervalDays, formatIntervalDays, gapsBetween, backupBannerVisible, DAY_MS,
} from '../src/lib/calc'
import type { Item, ItemRecord } from '../src/lib/types'

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime()

describe('calendar days', () => {
  it('startOfDay is local midnight', () => {
    expect(startOfDay(at(2026, 9, 20, 14, 32))).toBe(at(2026, 9, 20))
  })
  it('23:00 yesterday → 00:30 today is 1 day', () => {
    expect(calendarDaysBetween(at(2026, 9, 19, 23), at(2026, 9, 20, 0, 30))).toBe(1)
  })
  it('same day is 0', () => {
    expect(calendarDaysBetween(at(2026, 9, 20, 1), at(2026, 9, 20, 23))).toBe(0)
  })
  it('across a DST change still counts whole days', () => {
    const prev = process.env['TZ']
    process.env['TZ'] = 'America/New_York'
    try {
      // 2026-03-08 is the US spring-forward date
      expect(calendarDaysBetween(new Date(2026, 2, 7, 12).getTime(), new Date(2026, 2, 9, 12).getTime())).toBe(2)
    } finally {
      process.env['TZ'] = prev
    }
  })
})

describe('since', () => {
  const now = at(2026, 9, 20, 14, 32)
  it('< 60 min is 剛剛', () => {
    const s = since(now - 59 * 60_000, now)
    expect(s.kind).toBe('now')
    expect(sinceParts(s)).toEqual({ number: '剛剛', unit: '' })
  })
  it('same calendar day ≥ 60 min is N 小時', () => {
    const s = since(at(2026, 9, 20, 9, 0), now)
    expect(s).toMatchObject({ kind: 'hours', value: 5, days: 0 })
    expect(sinceParts(s)).toEqual({ number: '5', unit: '小時' })
  })
  it('yesterday late night is 1 天 even if < 24h', () => {
    const s = since(at(2026, 9, 19, 23, 0), at(2026, 9, 20, 0, 30))
    expect(s).toMatchObject({ kind: 'days', value: 1, days: 1 })
    expect(sinceParts(s)).toEqual({ number: '1', unit: '天' })
  })
  it("'now' across midnight reports days 0, not the calendar-day difference", () => {
    expect(since(at(2026, 9, 19, 23, 50), at(2026, 9, 20, 0, 10))).toEqual({ kind: 'now', value: 0, days: 0 })
  })
  it('future timestamps clamp to 剛剛', () => {
    expect(since(now + 5 * 60_000, now).kind).toBe('now')
  })
})

describe('numberStyle', () => {
  it('剛剛 and hours are fixed 18px / 420', () => {
    expect(numberStyle({ kind: 'now', value: 0, days: 0 })).toEqual({ fontSizePx: 18, fontWeight: 420 })
    expect(numberStyle({ kind: 'hours', value: 3, days: 0 })).toEqual({ fontSizePx: 18, fontWeight: 420 })
  })
  it('grows with log2 and caps at 44px / 680', () => {
    const d = (days: number) => numberStyle({ kind: 'days', value: days, days })
    expect(d(1).fontSizePx).toBeCloseTo(28, 5)       // 22 + 6*log2(2)
    expect(d(7).fontSizePx).toBeCloseTo(40, 5)       // 22 + 6*3
    expect(d(120).fontSizePx).toBe(44)
    expect(d(1).fontWeight).toBe(424)
    expect(d(30).fontWeight).toBe(540)
    expect(d(200).fontWeight).toBe(680)
    expect(d(1).fontSizePx).toBeLessThan(d(7).fontSizePx)
    expect(d(7).fontSizePx).toBeLessThan(d(30).fontSizePx)
    expect(d(30).fontSizePx).toBeLessThanOrEqual(d(120).fontSizePx) // both hit the 44px cap
  })
})

describe('isDue', () => {
  it('null expectDays never due', () => {
    expect(isDue(null, { kind: 'days', value: 400, days: 400 })).toBe(false)
  })
  it('due when days ≥ expectDays', () => {
    expect(isDue(14, { kind: 'days', value: 14, days: 14 })).toBe(true)
    expect(isDue(14, { kind: 'days', value: 13, days: 13 })).toBe(false)
  })
  it('same-day (hours/now) is never due even with expectDays 1', () => {
    expect(isDue(1, { kind: 'hours', value: 5, days: 0 })).toBe(false)
    expect(isDue(1, { kind: 'now', value: 0, days: 0 })).toBe(false)
  })
})

describe('normalizeExpectDays', () => {
  it.each([
    [14, 14], ['14', 14], [' 7 ', 7],
    [0, null], [-3, null], [2.5, null], ['abc', null], ['', null], [null, null], [undefined, null], [NaN, null], [Infinity, null],
    ['0', null], ['   ', null], ['0x1A', null], ['1e2', null], ['2.5', null], ['-3', null], ['+3', null], ['3 4', null], ['007', 7],
    [true, null], [{}, null], [[7], null],
  ])('%p → %p', (input, expected) => {
    expect(normalizeExpectDays(input)).toBe(expected)
  })
})

describe('normalizeName', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeName('  吃藥 ')).toBe('吃藥')
    expect(normalizeName('打電話  給  媽')).toBe('打電話 給 媽')
    expect(normalizeName('   ')).toBe('')
  })
})

const item = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 0, ...over })
const rec = (id: string, itemId: string, ts: number): ItemRecord => ({ id, itemId, ts, note: '' })

describe('home list', () => {
  const now = at(2026, 9, 20, 12)
  const items = [item('a'), item('b'), item('c'), item('z', { archived: true }), item('n')]
  const records = [
    rec('r1', 'a', at(2026, 9, 1)), rec('r2', 'a', at(2026, 9, 18)),
    rec('r3', 'b', at(2026, 9, 19)),
    rec('r4', 'c', at(2026, 8, 1)),
    rec('r5', 'z', at(2026, 9, 20)),
  ]
  const last = lastTsByItem(records)
  it('lastTsByItem keeps the max ts per item', () => {
    expect(last.get('a')).toBe(at(2026, 9, 18))
    expect(last.has('n')).toBe(false)
  })
  it('sorts most recent first, unrecorded last, archived excluded', () => {
    expect(sortItemsForHome(items, last).map((i) => i.id)).toEqual(['b', 'a', 'c', 'n'])
  })
  it('recent7 counts unarchived items with a record in the last 7×24h', () => {
    expect(recent7(items, last, now)).toEqual({ done: 2, total: 4 })
  })
})

describe('intervals and gaps', () => {
  it('needs at least 3 records', () => {
    expect(averageIntervalDays([at(2026, 9, 1), at(2026, 9, 10)])).toBeNull()
  })
  it('(latest − earliest) / (n − 1) in days, order-independent', () => {
    const tss = [at(2026, 9, 10), at(2026, 9, 1), at(2026, 9, 19)]
    expect(averageIntervalDays(tss)).toBeCloseTo(9, 5)
  })
  it('handles very large arrays without spreading into Math.min/max', () => {
    const base = at(2026, 1, 1)
    const tss = Array.from({ length: 3000 }, (_, i) => base + i * DAY_MS)
    expect(averageIntervalDays(tss)).toBeCloseTo(1, 5)
    const big = Array.from({ length: 200_000 }, (_, i) => base + i * 60_000)
    expect(averageIntervalDays(big)).toBeCloseTo(60_000 / DAY_MS, 9)
  })
  it('formats < 10 with one decimal, else integer', () => {
    expect(formatIntervalDays(9.26)).toBe('9.3')
    expect(formatIntervalDays(14.6)).toBe('15')
    expect(formatIntervalDays(10)).toBe('10')
  })
  it.each([
    [9.94, '9.9'], [9.95, '10'], [9.96, '10'], [10, '10'], [0.04, '0.0'], [9.5, '9.5'],
  ])('rounds first, then picks the format: %p → %p', (days, out) => {
    expect(formatIntervalDays(days)).toBe(out)
  })
  it('gapsBetween returns calendar-day gaps for a newest-first list', () => {
    expect(gapsBetween([at(2026, 9, 20, 8), at(2026, 9, 20, 7), at(2026, 9, 6, 23)])).toEqual([0, 14])
    expect(gapsBetween([at(2026, 9, 20)])).toEqual([])
  })
})

describe('backupBannerVisible', () => {
  const now = at(2026, 10, 5, 9)
  it('hidden under 5 records', () => {
    expect(backupBannerVisible(4, { lastBackupAt: null, backupSnoozeUntil: null }, now)).toBe(false)
  })
  it('shown at 5 records never backed up', () => {
    expect(backupBannerVisible(5, { lastBackupAt: null, backupSnoozeUntil: null }, now)).toBe(true)
  })
  it('shown when last backup older than 14 days, hidden if newer', () => {
    expect(backupBannerVisible(50, { lastBackupAt: now - 15 * DAY_MS, backupSnoozeUntil: null }, now)).toBe(true)
    expect(backupBannerVisible(50, { lastBackupAt: now - 13 * DAY_MS, backupSnoozeUntil: null }, now)).toBe(false)
  })
  it('exactly 14 days since the last backup is not yet "over 14 days"', () => {
    expect(backupBannerVisible(50, { lastBackupAt: now - 14 * DAY_MS, backupSnoozeUntil: null }, now)).toBe(false)
    expect(backupBannerVisible(50, { lastBackupAt: now - 14 * DAY_MS - 1, backupSnoozeUntil: null }, now)).toBe(true)
  })
  it('snooze ending exactly now still hides (shown only once now > snoozeUntil)', () => {
    expect(backupBannerVisible(50, { lastBackupAt: null, backupSnoozeUntil: now }, now)).toBe(false)
  })
  it('snooze hides until the snooze time passes', () => {
    expect(backupBannerVisible(50, { lastBackupAt: null, backupSnoozeUntil: now + 1 }, now)).toBe(false)
    expect(backupBannerVisible(50, { lastBackupAt: null, backupSnoozeUntil: now - 1 }, now)).toBe(true)
  })
})
