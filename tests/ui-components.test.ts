// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import Toast from '../src/components/Toast.svelte'
import MonthCalendar from '../src/components/MonthCalendar.svelte'
import EmptyState from '../src/components/EmptyState.svelte'
import { toasts } from '../src/lib/toast.svelte'

let target: HTMLElement
let component: ReturnType<typeof mount> | undefined

beforeEach(() => {
  document.body.innerHTML = ''
  target = document.createElement('div')
  document.body.append(target)
  toasts.dismiss()
})
afterEach(() => {
  if (component) unmount(component)
  component = undefined
  toasts.dismiss()
})

describe('Toast.svelte live region', () => {
  it('keeps one polite status region mounted and swaps only its content', () => {
    component = mount(Toast, { target })
    flushSync()
    const region = target.querySelector('[role="status"]')
    expect(region).not.toBeNull()
    expect(region!.getAttribute('aria-live')).toBe('polite')
    expect(region!.textContent!.trim()).toBe('')

    toasts.show('已匯出備份')
    flushSync()
    expect(target.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(target.querySelector('[role="status"]')).toBe(region)
    expect(region!.textContent).toContain('已匯出備份')

    toasts.show('已加入 3 筆', [{ label: '復原', run: () => {} }])
    flushSync()
    expect(target.querySelector('[role="status"]')).toBe(region)
    expect(region!.textContent).toContain('已加入 3 筆')
    expect(region!.querySelector('button')?.textContent).toBe('復原')

    toasts.dismiss()
    flushSync()
    expect(target.querySelector('[role="status"]')).toBe(region)
    expect(region!.textContent!.trim()).toBe('')
  })
})

describe('MonthCalendar.svelte labels', () => {
  const today = new Date(2026, 8, 20, 10).getTime()

  it('hides the weekday header from screen readers and says which days already have a record', () => {
    component = mount(MonthCalendar, {
      target,
      props: { year: 2026, month0: 8, todayTs: today, selected: new Set<string>(), marked: new Set(['2026-09-10']), ontoggle: () => {} },
    })
    flushSync()
    const wds = [...target.querySelectorAll('.wd')]
    expect(wds).toHaveLength(7)
    for (const w of wds) expect(w.getAttribute('aria-hidden')).toBe('true')

    const label = (key: string) => target.querySelector(`button[aria-label^="${key}"]`)?.getAttribute('aria-label')
    expect(label('2026-09-10')).toBe('2026-09-10，已有紀錄')
    expect(label('2026-09-11')).toBe('2026-09-11')
  })
})

describe('EmptyState.svelte note', () => {
  it('renders the optional note inside the empty state, after the sample chips', () => {
    component = mount(EmptyState, { target, props: { onpick: () => {}, note: '有 2 個已封存的項目，可在設定取消封存' } })
    flushSync()
    const note = target.querySelector('.empty > .note')
    expect(note?.textContent).toBe('有 2 個已封存的項目，可在設定取消封存')
    expect(note?.previousElementSibling?.classList.contains('chips')).toBe(true)
  })
  it('renders no note without one', () => {
    component = mount(EmptyState, { target, props: { onpick: () => {} } })
    flushSync()
    expect(target.querySelector('.note')).toBeNull()
  })
})
