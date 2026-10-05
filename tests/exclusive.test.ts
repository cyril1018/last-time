import { describe, it, expect, vi } from 'vitest'
import { exclusive } from '../src/lib/exclusive'

function deferred() {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('exclusive', () => {
  it('ignores a second call while the first is pending', async () => {
    const d = deferred()
    const fn = vi.fn((_x: number) => d.promise)
    const run = exclusive(fn)
    const first = run(1)
    const second = run(2)
    await second
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
    d.resolve()
    await first
  })

  it('releases the guard after the call resolves', async () => {
    const fn = vi.fn(async () => {})
    const run = exclusive(fn)
    await run()
    await run()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('releases the guard after the call rejects', async () => {
    const d = deferred()
    const fn = vi.fn().mockReturnValueOnce(d.promise).mockResolvedValue(undefined)
    const run = exclusive(fn)
    const first = run()
    d.reject(new Error('boom'))
    await expect(first).rejects.toThrow('boom')
    await run()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('guards each wrapped function separately', async () => {
    const d = deferred()
    const a = vi.fn(() => d.promise)
    const b = vi.fn(async () => {})
    const runA = exclusive(a)
    const runB = exclusive(b)
    const pa = runA()
    await runB()
    expect(b).toHaveBeenCalledTimes(1)
    d.resolve()
    await pa
  })
})
