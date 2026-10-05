// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { modal } from '../src/lib/modal'

let opener: HTMLButtonElement
let dialog: HTMLElement
let onEscape: ReturnType<typeof vi.fn<() => void>>
let teardown: (() => void) | undefined

/** A sheet-shaped dialog: header close button, then a body with the fields. */
function build(bodyHtml: string): HTMLElement {
  const d = document.createElement('div')
  d.setAttribute('role', 'dialog')
  d.tabIndex = -1
  d.innerHTML = `<header><button id="close">✕</button></header><div class="body">${bodyHtml}</div>`
  document.body.append(d)
  return d
}

const key = (k: string, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true })
  ;(document.activeElement ?? document.body).dispatchEvent(e)
  return e
}
const byId = (id: string) => document.getElementById(id) as HTMLElement

beforeEach(() => {
  document.body.innerHTML = ''
  opener = document.createElement('button')
  opener.textContent = 'open'
  document.body.append(opener)
  opener.focus()
  onEscape = vi.fn<() => void>()
})
afterEach(() => {
  teardown?.()
  teardown = undefined
})

describe('modal attachment', () => {
  it('focuses the first field of the body on open', () => {
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(byId('a'))
  })

  it('focuses the dialog itself when the body has nothing focusable', () => {
    dialog = build('<p>text</p>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(dialog)
  })

  it('skips disabled controls when picking the first field', () => {
    dialog = build('<button id="x" disabled>x</button><input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(byId('a'))
  })

  it('Escape calls onEscape', () => {
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    const e = key('Escape')
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBe(true)
  })

  it('Escape does nothing after teardown', () => {
    dialog = build('<input id="a" />')
    modal({ onEscape, initialFocusWithin: '.body' })(dialog)()
    key('Escape')
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('Tab on the last focusable wraps to the first (the header close button)', () => {
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    byId('b').focus()
    const e = key('Tab')
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byId('close'))
  })

  it('Shift+Tab on the first focusable wraps to the last', () => {
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    byId('close').focus()
    const e = key('Tab', true)
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byId('b'))
  })

  it('Shift+Tab on the dialog container itself wraps to the last', () => {
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    dialog.focus()
    key('Tab', true)
    expect(document.activeElement).toBe(byId('b'))
  })

  it('Tab in the middle is left to the browser', () => {
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    byId('a').focus()
    expect(key('Tab').defaultPrevented).toBe(false)
    expect(key('Tab', true).defaultPrevented).toBe(false)
  })

  it('Tab with focus outside the dialog pulls it back to the first focusable', () => {
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    opener.focus()
    const e = key('Tab')
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byId('close'))
  })

  it('returns focus to the opener on teardown', () => {
    dialog = build('<input id="a" />')
    modal({ onEscape, initialFocusWithin: '.body' })(dialog)()
    expect(document.activeElement).toBe(opener)
  })

  it('does not try to focus an opener that has left the document', () => {
    dialog = build('<input id="a" />')
    const done = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    opener.remove()
    const spy = vi.spyOn(opener, 'focus')
    done()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('modal initial focus by pointer type (fix round 1, F3)', () => {
  const pointer = (coarse: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' && coarse }))
  afterEach(() => { vi.unstubAllGlobals() })

  it('touch (coarse pointer): focuses the dialog itself, so no field raises the keyboard', () => {
    pointer(true)
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(dialog)
  })

  it('fine pointer: focuses the first field', () => {
    pointer(false)
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(byId('a'))
  })

  it('no matchMedia: behaves like a fine pointer', () => {
    vi.stubGlobal('matchMedia', undefined)
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(byId('a'))
  })

  it('touch: Tab from the focused dialog still stays inside', () => {
    pointer(true)
    dialog = build('<input id="a" /><button id="b">ok</button>')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(key('Tab', true).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byId('b'))
  })
})

describe('modal minors (fix round 1, F4)', () => {
  it('Escape during IME composition does not close the sheet', () => {
    dialog = build('<input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    const composing = new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true, cancelable: true })
    byId('a').dispatchEvent(composing)
    const legacy = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true, cancelable: true } as KeyboardEventInit)
    byId('a').dispatchEvent(legacy)
    expect(onEscape).not.toHaveBeenCalled()
    expect(composing.defaultPrevented).toBe(false)
    expect(legacy.defaultPrevented).toBe(false)
  })

  it.each([
    ['a hidden control', '<button id="h" hidden>h</button>'],
    ['a control inside display:none', '<div style="display:none"><button id="h">h</button></div>'],
  ])('the trap ignores %s at the end of the dialog', (_name, tail) => {
    dialog = build(`<input id="a" /><button id="b">ok</button>${tail}`)
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    byId('b').focus()
    expect(key('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byId('close'))
    byId('close').focus()
    key('Tab', true)
    expect(document.activeElement).toBe(byId('b'))
  })

  it('initial focus skips a field that is not rendered', () => {
    dialog = build('<div style="display:none"><input id="n" /></div><input id="h" hidden /><input id="a" />')
    teardown = modal({ onEscape, initialFocusWithin: '.body' })(dialog)
    expect(document.activeElement).toBe(byId('a'))
  })
})
