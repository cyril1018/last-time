import { describe, it, expect } from 'vitest'
import { monthGrid, monthLabel, combineDateTime } from '../src/lib/calendar'

const today = new Date(2026, 8, 20, 10).getTime() // Sun 2026-09-20

describe('monthGrid', () => {
  const g = monthGrid(2026, 8, today)
  it('has 42 cells starting on a Monday', () => {
    expect(g).toHaveLength(42)
    expect(new Date(g[0]!.ts).getDay()).toBe(1)
  })
  it('Sept 2026 starts on Tuesday → first cell is Aug 31', () => {
    expect(g[0]).toMatchObject({ day: 31, inMonth: false })
    expect(g[1]).toMatchObject({ day: 1, inMonth: true, key: '2026-09-01' })
  })
  it('marks today and future', () => {
    const t = g.find((c) => c.key === '2026-09-20')!
    expect(t.today).toBe(true)
    expect(t.future).toBe(false)
    expect(g.find((c) => c.key === '2026-09-21')!.future).toBe(true)
    expect(g.find((c) => c.key === '2026-09-19')!.future).toBe(false)
  })
  it('label', () => expect(monthLabel(2026, 8)).toBe('2026 年 9 月'))
})

describe('combineDateTime', () => {
  it('applies HH:mm to a local day', () => {
    const day = new Date(2026, 8, 5).getTime()
    expect(combineDateTime(day, '12:00')).toBe(new Date(2026, 8, 5, 12, 0).getTime())
    expect(combineDateTime(day, '')).toBeNull()
    expect(combineDateTime(day, '25:00')).toBeNull()
  })
})
