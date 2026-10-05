import { describe, it, expect } from 'vitest'

// tests/setup.ts pins process.env.TZ; check that exact zone took effect, not merely some UTC+8 zone.
describe('environment', () => {
  it('runs in the Asia/Taipei zone that tests/setup.ts sets', () => {
    expect(process.env['TZ']).toBe('Asia/Taipei')
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Taipei')
    expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(-480)
    expect(new Date(2026, 6, 1, 12).getTimezoneOffset()).toBe(-480) // no DST
  })
})
