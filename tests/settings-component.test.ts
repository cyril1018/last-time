// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import Settings from '../src/components/Settings.svelte'
import { store } from '../src/lib/app-store'
import { i18n } from '../src/lib/i18n/i18n.svelte'

let target: HTMLElement
let c: ReturnType<typeof mount> | undefined

beforeEach(() => {
  document.body.innerHTML = ''
  target = document.createElement('div')
  document.body.append(target)
  i18n.languages = ['zh-TW']
  store.updateSettings({ language: 'system' })
})
afterEach(() => {
  if (c) unmount(c)
  c = undefined
  store.updateSettings({ language: 'system' })
})

/** The language select is the one offering "en" (the theme select also has a "system" option). */
const langSelect = () => [...target.querySelectorAll('select')].find((s) => s.querySelector('option[value="en"]'))!

function pick(value: string) {
  const select = langSelect()
  select.value = value
  // Svelte delegates change to the mount root, so the event has to bubble like a real one.
  select.dispatchEvent(new Event('change', { bubbles: true }))
  flushSync()
}

describe('Settings language picker', () => {
  it('always reads the same in both languages', () => {
    c = mount(Settings, { target })
    flushSync()
    const label = () => [...target.querySelectorAll('label.field span')].map((s) => s.textContent)
    const options = () => [...langSelect().querySelectorAll('option')].map((o) => o.textContent)
    expect(label()).toContain('語言 / Language')
    expect(options()).toEqual(['跟隨系統 / System', '繁體中文', 'English'])
    pick('en')
    expect(label()).toContain('語言 / Language')
    expect(options()).toEqual(['跟隨系統 / System', '繁體中文', 'English'])
  })
  it('switches the whole page immediately and remembers the choice', () => {
    c = mount(Settings, { target })
    flushSync()
    expect(target.querySelector('h1')?.textContent).toBe('設定')
    pick('en')
    expect(target.querySelector('h1')?.textContent).toBe('Settings')
    expect(store.settings.language).toBe('en')
    pick('system')
    expect(target.querySelector('h1')?.textContent).toBe('設定')
  })
})
