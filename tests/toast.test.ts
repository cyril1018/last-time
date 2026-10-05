import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toasts, type ToastAction } from '../src/lib/toast.svelte'

/** What Toast.svelte does on a button tap: dismiss first, then run the action. */
function tap(action: ToastAction): void {
  toasts.dismiss()
  action.run()
}

beforeEach(() => {
  vi.useFakeTimers()
  toasts.dismiss()
})
afterEach(() => {
  toasts.dismiss()
  vi.useRealTimers()
})

describe('toasts', () => {
  it('a toast with actions auto-dismisses after 8 s (spec §7.8)', () => {
    toasts.show('已記錄', [{ label: '復原', run: () => {} }])
    vi.advanceTimersByTime(7999)
    expect(toasts.current?.message).toBe('已記錄')
    vi.advanceTimersByTime(1)
    expect(toasts.current).toBeNull()
  })
  it('a message-only toast auto-dismisses after 3 s', () => {
    toasts.show('已匯入')
    vi.advanceTimersByTime(2999)
    expect(toasts.current?.message).toBe('已匯入')
    vi.advanceTimersByTime(1)
    expect(toasts.current).toBeNull()
  })
  it('show replaces the previous toast and its timer', () => {
    toasts.show('first', [{ label: 'x', run: () => {} }])
    const firstId = toasts.current!.id
    vi.advanceTimersByTime(5000)
    toasts.show('second', [{ label: 'y', run: () => {} }])
    expect(toasts.current?.message).toBe('second')
    expect(toasts.current?.id).not.toBe(firstId)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(3000) // the first toast's deadline: must not take the second one down
    expect(toasts.current?.message).toBe('second')
    vi.advanceTimersByTime(5000)
    expect(toasts.current).toBeNull()
  })
  it('dismiss clears the toast and its timer', () => {
    toasts.show('x')
    expect(vi.getTimerCount()).toBe(1)
    toasts.dismiss()
    expect(toasts.current).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it("a toast shown from an action's run() survives the tap's dismiss", () => {
    toasts.show('已記錄', [{ label: '復原', run: () => toasts.show('復原失敗') }])
    tap(toasts.current!.actions[0]!)
    expect(toasts.current?.message).toBe('復原失敗')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(2999)
    expect(toasts.current?.message).toBe('復原失敗')
    vi.advanceTimersByTime(1)
    expect(toasts.current).toBeNull()
  })
})
