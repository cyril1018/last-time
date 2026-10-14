// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveLocale, dateLocaleFor, HTML_LANG, MANIFEST_FILE, applyLocaleToDocument } from '../src/lib/i18n/locale'

describe('resolveLocale', () => {
  it.each([
    [['zh-TW'], 'zh-TW'],
    [['zh-HK', 'en'], 'zh-TW'],
    [['zh-CN'], 'zh-TW'],
    [['ZH'], 'zh-TW'],
    [['zh'], 'zh-TW'],
    [['en-US', 'zh-TW'], 'en'],
    [['ja'], 'en'],
    [['fr-FR'], 'en'],
    [[], 'en'],
  ] as const)('system with %j → %s', (languages, expected) => {
    expect(resolveLocale('system', languages)).toBe(expected)
  })

  it('an explicit choice beats the system language', () => {
    expect(resolveLocale('en', ['zh-TW'])).toBe('en')
    expect(resolveLocale('zh-TW', ['en-US'])).toBe('zh-TW')
  })
})

describe('dateLocaleFor', () => {
  it('Chinese always formats as zh-TW', () => {
    expect(dateLocaleFor('zh-TW', ['en-GB'])).toBe('zh-TW')
  })
  it('English uses the first English tag the phone lists', () => {
    expect(dateLocaleFor('en', ['en-GB'])).toBe('en-GB')
    expect(dateLocaleFor('en', ['zh-TW', 'en-AU'])).toBe('en-AU')
  })
  it('English without an English tag is en-US', () => {
    expect(dateLocaleFor('en', ['ja'])).toBe('en-US')
    expect(dateLocaleFor('en', [])).toBe('en-US')
  })
  it('a tag Intl rejects falls back to en-US instead of throwing', () => {
    expect(dateLocaleFor('en', ['en-'])).toBe('en-US')
    expect(dateLocaleFor('en', ['en_US'])).toBe('en-US')
  })
})

describe('applyLocaleToDocument', () => {
  beforeEach(() => {
    document.head.innerHTML = '<link rel="manifest" href="/last-time/manifest.webmanifest" />'
    document.documentElement.lang = 'zh-Hant-TW'
  })
  it('sets <html lang> and points the manifest link at the matching file', () => {
    applyLocaleToDocument('en', document, '/last-time/')
    expect(document.documentElement.lang).toBe('en')
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/last-time/manifest-en.webmanifest')
    applyLocaleToDocument('zh-TW', document, '/last-time/')
    expect(document.documentElement.lang).toBe('zh-Hant-TW')
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/last-time/manifest.webmanifest')
  })
  it('works without a manifest link (dev server, tests)', () => {
    document.head.innerHTML = ''
    expect(() => applyLocaleToDocument('en', document, '/last-time/')).not.toThrow()
    expect(document.documentElement.lang).toBe('en')
  })
  it('exposes the constants the boot script and vite.config share', () => {
    expect(HTML_LANG).toEqual({ 'zh-TW': 'zh-Hant-TW', en: 'en' })
    expect(MANIFEST_FILE).toEqual({ 'zh-TW': 'manifest.webmanifest', en: 'manifest-en.webmanifest' })
  })
})
