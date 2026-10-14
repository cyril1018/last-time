// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'

vi.mock('../src/lib/sheet.svelte', () => ({ sheets: { close: vi.fn(), closeThen: vi.fn() } }))

import EditItemSheet from '../src/components/EditItemSheet.svelte'
import { store } from '../src/lib/app-store'
import { i18n } from '../src/lib/i18n/i18n.svelte'

let target: HTMLElement
let c: ReturnType<typeof mount> | undefined

beforeEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  target = document.createElement('div')
  document.body.append(target)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  i18n.languages = ['zh-TW']
  store.items = [{ id: 'a', name: '洗衣服', emoji: '🧼', expectDays: null, archived: false, created: 0 }]
  c = mount(EditItemSheet, { target, props: { itemId: 'a' } })
  flushSync()
})
afterEach(() => {
  if (c) unmount(c)
  c = undefined
  store.items = []
  vi.unstubAllGlobals()
})

const more = () => target.querySelector<HTMLButtonElement>('button[aria-label="更多圖示"]')!
const panel = () => target.querySelector('#more-emoji')
const iconInput = () => [...target.querySelectorAll<HTMLInputElement>('label.field input')][1]!

describe('EditItemSheet more icons', () => {
  it('starts collapsed and says so', () => {
    expect(more().getAttribute('aria-expanded')).toBe('false')
    expect(more().getAttribute('aria-controls')).toBe('more-emoji')
    expect(panel()).toBeNull()
  })
  it('expands into labelled category groups', () => {
    more().click()
    flushSync()
    expect(more().getAttribute('aria-expanded')).toBe('true')
    const groups = [...panel()!.querySelectorAll('[role="group"]')].map((g) => g.getAttribute('aria-label'))
    expect(groups).toEqual(['家務', '個人保養', '健康', '運動', '寵物與植物', '交通', '帳單與錢', '生活用品', '社交與休閒'])
  })
  it('marks the current emoji in the panel too', () => {
    more().click()
    flushSync()
    expect(panel()!.querySelector('button.on')?.textContent).toBe('🧼')
  })
  it('picking one sets the icon, collapses the panel and returns focus to the toggle', () => {
    more().click()
    flushSync()
    panel()!.querySelector<HTMLButtonElement>('button[aria-label="選擇 🧺"]')!.click()
    flushSync()
    expect(iconInput().value).toBe('🧺')
    expect(panel()).toBeNull()
    expect(more().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(more())
  })
  it('the toggle also collapses it', () => {
    more().click()
    flushSync()
    more().click()
    flushSync()
    expect(panel()).toBeNull()
  })
  it('labels the toggle and groups in English', () => {
    unmount(c!)
    i18n.languages = ['en-US']
    c = mount(EditItemSheet, { target, props: { itemId: 'a' } })
    flushSync()
    const toggle = target.querySelector<HTMLButtonElement>('button[aria-label="More icons"]')!
    toggle.click()
    flushSync()
    expect(target.querySelector('#more-emoji [role="group"]')?.getAttribute('aria-label')).toBe('Chores')
  })
})
