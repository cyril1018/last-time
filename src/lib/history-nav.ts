/**
 * Shared history bookkeeping for the router and the sheets.
 *
 * history.state of every entry we create: `{ depth?: number, 'lasttime-sheet'?: <sheet> | true }`.
 *  - depth: how many in-app pages sit below this entry (0 = the entry the app was opened on).
 *  - sheet mark: this entry exists only to let the back key close an open sheet; it shares the depth
 *    of the page under it.
 *
 * history.back() is asynchronous, and a second history change issued before the first popstate lands
 * would act on the wrong entry (two queued backs can walk out of the app). So every change that depends
 * on the current entry goes through whenSettled(): it runs at once when nothing is in flight, otherwise
 * right after the pending popstate, once the router and sheets have re-synced from the new entry.
 *
 * Two safety valves keep the queue from wedging: a back() that produces no popstate within
 * BACK_TIMEOUT_MS (e.g. nothing before the first entry of a standalone launch) stops counting as in flight,
 * and a queued step that throws is logged and skipped.
 */
export const SHEET_MARK = 'lasttime-sheet'

/** How long a back() may take to land before the queue stops waiting for its popstate. */
export const BACK_TIMEOUT_MS = 400

let inFlight = false
let watchdog: ReturnType<typeof setTimeout> | undefined
let backSeq = 0
/** Ids of backs the watchdog released; each is read (and forgotten) by whoever issued it, if they care. */
const timedOut = new Set<number>()
let draining = false
let started = false
const waiting: Array<() => void> = []
const syncers: Array<() => void> = []

function drain(): void {
  if (draining) return
  draining = true
  try {
    while (!inFlight && waiting.length) {
      const fn = waiting.shift()!
      try {
        fn()
      } catch (e) {
        console.error(e)
      }
    }
  } finally {
    draining = false
  }
}

export function startHistory(): void {
  if (started) return
  started = true
  window.addEventListener('popstate', () => {
    clearTimeout(watchdog)
    for (const sync of syncers) {
      try {
        sync()
      } catch (e) {
        console.error(e) // a broken syncer must not leave the traversal in flight forever
      }
    }
    inFlight = false
    drain()
  })
}

/** Called on every popstate (system back, our own back()), before queued work runs. */
export function onHistorySync(fn: () => void): void {
  syncers.push(fn)
}

/** Run `fn` now, or after the history traversal currently in flight has landed. */
export function whenSettled(fn: () => void): void {
  waiting.push(fn)
  drain()
}

/**
 * history.back(), marking a traversal in flight. Only call from inside whenSettled(). Returns an id for
 * backTimedOut(), so a caller that walks back step by step can stop when a back went nowhere.
 */
export function back(): number {
  const id = ++backSeq
  inFlight = true
  clearTimeout(watchdog)
  // No popstate in time: the traversal went nowhere. Stop waiting; a late popstate still re-syncs.
  watchdog = setTimeout(() => {
    timedOut.add(id)
    inFlight = false
    drain()
  }, BACK_TIMEOUT_MS)
  history.back()
  return id
}

/** Whether back number `id` was released by the watchdog instead of landing. Reading it forgets it. */
export function backTimedOut(id: number): boolean {
  return timedOut.delete(id)
}

export function currentState(): Record<string, unknown> {
  const s: unknown = history.state
  return s !== null && typeof s === 'object' ? (s as Record<string, unknown>) : {}
}

export function currentDepth(): number {
  const d = currentState()['depth']
  return typeof d === 'number' && Number.isInteger(d) && d > 0 ? d : 0
}

export function sheetMark(): unknown {
  return currentState()[SHEET_MARK]
}

/** A copy of an entry's state without the sheet marker. */
export function withoutSheetMark(state: Record<string, unknown>): Record<string, unknown> {
  const { [SHEET_MARK]: _mark, ...rest } = state
  return rest
}
