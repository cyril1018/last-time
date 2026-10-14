import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = join(process.cwd(), 'src')

/** Files allowed to hold Chinese, each with its reason. */
const ALLOWED_FILES: Record<string, string> = {
  'lib/i18n/zh-TW.ts': 'the Chinese message table',
  'lib/emoji.ts': 'Chinese emoji keywords',
  'lib/format.ts': 'the hand-built Chinese date format',
  'lib/calendar.ts': "monthLabel's Chinese format",
}
/** Exact strings allowed elsewhere: the language picker must read the same in both languages. */
const ALLOWED_STRINGS: Record<string, string[]> = {
  'components/Settings.svelte': ['語言 / Language', '跟隨系統 / System', '繁體中文'],
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === 'assets' ? [] : walk(p)
    return /\.(ts|svelte)$/.test(n) ? [p] : []
  })
}
const stripComments = (s: string) =>
  s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

describe('no hard-coded Chinese outside the message table', () => {
  it.each(walk(ROOT).map((p) => relative(ROOT, p).split(sep).join('/')).filter((f) => !(f in ALLOWED_FILES)))('%s', (file) => {
    let code = stripComments(readFileSync(join(ROOT, file), 'utf8'))
    for (const s of ALLOWED_STRINGS[file] ?? []) code = code.split(s).join('')
    const lines = code.split('\n').filter((l) => /\p{Script=Han}/u.test(l))
    expect(lines).toEqual([])
  })
})
