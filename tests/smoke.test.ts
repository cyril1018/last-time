import { describe, it, expect } from 'vitest'

describe('environment', () => {
  it('runs in Asia/Taipei', () => {
    expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(-480)
  })
})
