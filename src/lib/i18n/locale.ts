import type { LanguageSetting, Locale } from '../types'

/** `<html lang>` per locale. index.html's boot script spells the same two values out. */
export const HTML_LANG: Record<Locale, string> = { 'zh-TW': 'zh-Hant-TW', en: 'en' }

/** Manifest file per locale, relative to `base`. vite.config.ts emits both. */
export const MANIFEST_FILE: Record<Locale, string> = { 'zh-TW': 'manifest.webmanifest', en: 'manifest-en.webmanifest' }

/** Spec §2.2. Every Chinese variant gets Traditional Chinese; everything else gets English. */
export function resolveLocale(setting: LanguageSetting, languages: readonly string[]): Locale {
  if (setting !== 'system') return setting
  return /^zh/i.test(languages[0] ?? '') ? 'zh-TW' : 'en'
}

function intlAccepts(tag: string): boolean {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0
  } catch {
    return false
  }
}

/** The tag dates are formatted with: the phone's first English variant, so en-GB keeps its 24-hour clock. */
export function dateLocaleFor(locale: Locale, languages: readonly string[]): string {
  if (locale === 'zh-TW') return 'zh-TW'
  return languages.find((l) => /^en(-|$)/i.test(l) && intlAccepts(l)) ?? 'en-US'
}

/** Keeps `<html lang>` and the manifest link in step with the locale. A missing link (dev, tests) is fine. */
export function applyLocaleToDocument(locale: Locale, doc: Document, base: string): void {
  doc.documentElement.lang = HTML_LANG[locale]
  doc.querySelector('link[rel="manifest"]')?.setAttribute('href', `${base}${MANIFEST_FILE[locale]}`)
}
