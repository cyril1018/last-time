// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SETTINGS_KEY, loadSettings } from '../src/lib/settings'
import { resolveLocale, HTML_LANG } from '../src/lib/i18n/locale'

// The inline <script> in index.html that applies the saved theme before the first paint.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)
const boot = inline.find((s) => s.includes(SETTINGS_KEY))

function run(saved: string | null | (() => never), systemDark: boolean | 'missing') {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => {
      if (typeof saved === 'function') return saved()
      return k === SETTINGS_KEY ? saved : null
    },
  })
  vi.stubGlobal('matchMedia', systemDark === 'missing' ? undefined : (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' && systemDark }))
  new Function(boot!)()
  return {
    theme: document.documentElement.dataset['theme'],
    color: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  }
}

beforeEach(() => {
  delete document.documentElement.dataset['theme']
  document.head.innerHTML = '<meta name="theme-color" content="#f6f7f4" />'
})
afterEach(() => { vi.unstubAllGlobals() })

describe('index.html theme boot script', () => {
  it('exists as a classic inline script placed before the app module and after the theme-color meta', () => {
    expect(boot).toBeDefined()
    const at = html.indexOf(boot!)
    expect(at).toBeGreaterThan(html.indexOf('name="theme-color"'))
    expect(at).toBeLessThan(html.indexOf('<script type="module"'))
  })

  it.each([
    ['dark saved', JSON.stringify({ theme: 'dark' }), false, 'dark', '#121411'],
    ['light saved, dark system', JSON.stringify({ theme: 'light' }), true, 'light', '#f6f7f4'],
    ['system saved, dark system', JSON.stringify({ theme: 'system' }), true, 'dark', '#121411'],
    ['system saved, light system', JSON.stringify({ theme: 'system' }), false, 'light', '#f6f7f4'],
    ['nothing saved, dark system', null, true, 'dark', '#121411'],
    ['corrupt JSON, dark system', '{nope', true, 'dark', '#121411'],
    ['JSON null, dark system', 'null', true, 'dark', '#121411'],
    ['unknown theme value, dark system', JSON.stringify({ theme: 'sepia' }), true, 'dark', '#121411'],
  ] as const)('%s', (_name, saved, systemDark, theme, color) => {
    expect(run(saved, systemDark)).toEqual({ theme, color })
  })

  it('storage that throws still follows the system theme', () => {
    expect(run(() => { throw new DOMException('blocked', 'SecurityError') }, true)).toEqual({ theme: 'dark', color: '#121411' })
  })

  it('never throws, even without matchMedia', () => {
    expect(() => run(JSON.stringify({ theme: 'system' }), 'missing')).not.toThrow()
  })

  it('uses the same colours as App.svelte', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.svelte'), 'utf8')
    expect(app).toContain("dark ? '#121411' : '#f6f7f4'")
    expect(boot).toContain("'#121411'")
    expect(boot).toContain("'#f6f7f4'")
  })
})

function runLang(saved: string | null | (() => never), languages: readonly string[] | undefined) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => {
      if (typeof saved === 'function') return saved()
      return k === SETTINGS_KEY ? saved : null
    },
  })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('navigator', languages === undefined ? {} : { languages })
  document.documentElement.lang = 'zh-Hant-TW'
  new Function(boot!)()
  return document.documentElement.lang
}

describe('index.html boot script: language', () => {
  const savedValues = [null, '{nope', 'null', ...['system', 'zh-TW', 'en', 'fr', 42].map((l) => JSON.stringify({ language: l }))]
  const languageLists: (readonly string[])[] = [['zh-TW'], ['zh-CN'], ['ZH'], ['en-US'], ['ja'], [], ['en-GB', 'zh-TW']]

  it.each(savedValues.flatMap((s) => languageLists.map((l) => [s, l] as const)))('saved %s, phone %j agrees with resolveLocale', (saved, languages) => {
    const storage = { getItem: (k: string) => (k === SETTINGS_KEY ? saved : null), setItem: () => {} }
    const expected = HTML_LANG[resolveLocale(loadSettings(storage).language, languages)]
    expect(runLang(saved, languages)).toBe(expected)
  })

  it('no navigator.languages → English, no throw', () => {
    expect(runLang(null, undefined)).toBe('en')
  })

  it('storage that throws still follows the phone', () => {
    expect(runLang(() => { throw new DOMException('blocked', 'SecurityError') }, ['zh-TW'])).toBe('zh-Hant-TW')
  })

  it('spells out the same <html lang> values as HTML_LANG', () => {
    expect(boot).toContain(`'${HTML_LANG['zh-TW']}'`)
    expect(boot).toContain(`'${HTML_LANG.en}'`)
  })
})
