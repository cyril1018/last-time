// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { longpress } from '../src/lib/longpress'

let node: HTMLElement
let fired: ReturnType<typeof vi.fn<() => void>>
let cleanup: (() => void) | void

const pointer = (type: string, x = 0, y = 0, button = 0) =>
  node.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button, bubbles: true, cancelable: true }))

beforeEach(() => {
  vi.useFakeTimers()
  node = document.createElement('div')
  document.body.appendChild(node)
  fired = vi.fn<() => void>()
  cleanup = longpress({ onLongPress: fired })(node)
})
afterEach(() => {
  if (cleanup) cleanup()
  node.remove()
  vi.useRealTimers()
})

describe('longpress', () => {
  it('fires after 450 ms of holding, not before', () => {
    pointer('pointerdown')
    vi.advanceTimersByTime(449)
    expect(fired).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fired).toHaveBeenCalledTimes(1)
  })
  it('ignores non-primary buttons', () => {
    pointer('pointerdown', 0, 0, 2)
    vi.advanceTimersByTime(1000)
    expect(fired).not.toHaveBeenCalled()
  })
  it('tolerates moves of up to 10 px', () => {
    pointer('pointerdown', 100, 100)
    pointer('pointermove', 110, 90)
    vi.advanceTimersByTime(450)
    expect(fired).toHaveBeenCalledTimes(1)
  })
  it.each([[111, 100], [100, 89]])('cancels when the pointer moves more than 10 px (to %i,%i)', (x, y) => {
    pointer('pointerdown', 100, 100)
    pointer('pointermove', x, y)
    vi.advanceTimersByTime(1000)
    expect(fired).not.toHaveBeenCalled()
  })
  it.each(['pointercancel', 'pointerup', 'pointerleave'])('cancels on %s before 450 ms', (type) => {
    pointer('pointerdown')
    vi.advanceTimersByTime(300)
    pointer(type)
    vi.advanceTimersByTime(1000)
    expect(fired).not.toHaveBeenCalled()
  })
  it('swallows the click that follows a fire, and only that one', () => {
    const onClick = vi.fn()
    node.addEventListener('click', onClick)
    pointer('pointerdown')
    vi.advanceTimersByTime(450)
    pointer('pointerup')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    node.dispatchEvent(click)
    expect(onClick).not.toHaveBeenCalled()
    expect(click.defaultPrevented).toBe(true)
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('lets an ordinary tap click through', () => {
    const onClick = vi.fn()
    node.addEventListener('click', onClick)
    pointer('pointerdown')
    vi.advanceTimersByTime(100)
    pointer('pointerup')
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('prevents the context menu', () => {
    const e = new Event('contextmenu', { bubbles: true, cancelable: true })
    node.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })
  it('cleanup removes the listeners and a pending timer', () => {
    pointer('pointerdown')
    if (cleanup) cleanup()
    cleanup = undefined
    vi.advanceTimersByTime(1000)
    expect(fired).not.toHaveBeenCalled()
    pointer('pointerdown')
    vi.advanceTimersByTime(1000)
    expect(fired).not.toHaveBeenCalled()
    const e = new Event('contextmenu', { bubbles: true, cancelable: true })
    node.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })
})
