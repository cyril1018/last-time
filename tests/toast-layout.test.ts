import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// happy-dom has no layout, so this pins the CSS itself. Measured at 360 px: one line holds ~202 px of text,
// while "Logged 📞 Call mom and dad at 12:45 PM" needs ~317 px, and the time at the end is what got cut.
const source = readFileSync(resolve(process.cwd(), 'src/components/Toast.svelte'), 'utf8')
const msgRule = /\.msg \{([^}]*)\}/.exec(source)?.[1] ?? ''

describe('Toast.svelte message layout', () => {
  it('wraps a long message onto a second line instead of cutting off its end', () => {
    expect(msgRule).not.toBe('')
    expect(msgRule).not.toMatch(/nowrap/)
    expect(msgRule).toMatch(/-webkit-line-clamp:\s*2/)
  })
})
