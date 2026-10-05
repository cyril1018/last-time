// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, unmount, flushSync, createRawSnippet } from 'svelte'

const close = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/sheet.svelte', () => ({ sheets: { close } }))

import Sheet from '../src/components/Sheet.svelte'

const children = createRawSnippet(() => ({ render: () => '<div><input id="name" /><button id="save">儲存</button></div>' }))

beforeEach(() => {
  document.body.innerHTML = ''
  close.mockClear()
})

describe('Sheet.svelte', () => {
  it('is an aria-modal dialog that takes focus, closes on Escape and returns focus on unmount', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const target = document.createElement('div')
    document.body.append(target)

    const c = mount(Sheet, { target, props: { title: '編輯項目', children } })
    flushSync()
    const dialog = target.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement?.id).toBe('name')

    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(close).toHaveBeenCalledTimes(1)

    unmount(c)
    expect(document.activeElement).toBe(opener)
  })
})
