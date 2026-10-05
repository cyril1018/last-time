/**
 * Wrap an async action so a second call while the first is still running is ignored (double-tap guard).
 * The guard releases when the call settles, whether it resolves or rejects.
 */
export function exclusive<A extends unknown[]>(fn: (...a: A) => Promise<unknown>): (...a: A) => Promise<void> {
  let running = false
  return async (...a: A) => {
    if (running) return
    running = true
    try {
      await fn(...a)
    } finally {
      running = false
    }
  }
}
