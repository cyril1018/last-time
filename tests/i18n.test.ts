import { describe, it, expect, afterEach } from 'vitest'
import { zhTW } from '../src/lib/i18n/zh-TW'
import { en } from '../src/lib/i18n/en'
import { messagesFor } from '../src/lib/i18n/messages'
import { i18n, readLanguages } from '../src/lib/i18n/i18n.svelte'
import { store } from '../src/lib/app-store'

/** Every string in a table; functions are called with 1 and with 2 so both plural branches show up. */
function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (typeof v === 'function') return [String(v(1, 1, 1)), String(v(2, 2, 2))]
  if (Array.isArray(v)) return v.flatMap(strings)
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings)
  return []
}

describe('translation tables', () => {
  it('English has no Chinese left in it', () => {
    const leftovers = strings(en).filter((s) => /\p{Script=Han}/u.test(s))
    expect(leftovers).toEqual([])
  })
  it('both tables have the same shape (runtime check on top of the type)', () => {
    const shape = (v: unknown): unknown =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]))
        : Array.isArray(v) ? `array:${v.length}` : typeof v
    expect(shape(en)).toEqual(shape(zhTW))
  })
  it('English plurals', () => {
    expect(en.timeline.gap(1)).toBe('1-day gap')
    expect(en.timeline.gap(3)).toBe('3-day gap')
    expect(en.backdate.added(1)).toBe('Added 1 entry')
    expect(en.backdate.added(4)).toBe('Added 4 entries')
    expect(en.import.imported(1, 1)).toBe('Imported 1 item and 1 entry')
    expect(en.import.imported(2, 5)).toBe('Imported 2 items and 5 entries')
    expect(en.settings.stats('1.0.0', 1, 2)).toBe('Version 1.0.0 · 1 item · 2 entries')
    expect(en.detail.everyDays(1)).toBe('About every day')
    expect(en.detail.everyDays(14)).toBe('About every 14 days')
    expect(en.detail.averageValue('1')).toBe('1 day')
    expect(en.detail.averageValue('2.5')).toBe('2.5 days')
  })
  it('messagesFor picks the table', () => {
    expect(messagesFor('zh-TW')).toBe(zhTW)
    expect(messagesFor('en')).toBe(en)
  })
})

describe('readLanguages', () => {
  it('copes with a navigator that has no languages list', () => {
    expect(readLanguages({})).toEqual([])
    expect(readLanguages({ languages: undefined })).toEqual([])
    expect(readLanguages({ languages: ['en-GB'] })).toEqual(['en-GB'])
  })
})

describe('i18n', () => {
  afterEach(() => {
    store.updateSettings({ language: 'system' })
    i18n.languages = []
  })
  // $derived class fields recompute on read outside an effect, so plain reads are enough here.
  it('follows the system language until the user picks one', () => {
    i18n.languages = ['zh-TW']
    store.updateSettings({ language: 'system' })
    expect(i18n.locale).toBe('zh-TW')
    expect(i18n.t.app.name).toBe('上次')
    expect(i18n.dateLocale).toBe('zh-TW')

    store.updateSettings({ language: 'en' })
    expect(i18n.locale).toBe('en')
    expect(i18n.t.app.name).toBe('Last Time')
    expect(i18n.dateLocale).toBe('en-US')

    store.updateSettings({ language: 'system' })
    i18n.languages = ['en-GB']
    expect(i18n.locale).toBe('en')
    expect(i18n.dateLocale).toBe('en-GB')
  })
})
