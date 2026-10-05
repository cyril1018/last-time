import type { ParsedBackup } from './backup'
import { SHEET_MARK, startHistory, onHistorySync, whenSettled, back, currentState, sheetMark, withoutSheetMark } from './history-nav'

export type SheetState =
  | { kind: 'edit-item'; itemId: string }
  | { kind: 'edit-record'; recordId: string }
  | { kind: 'backdate'; itemId: string }
  | { kind: 'import'; backup: ParsedBackup }
  | null

type RestorableSheet = Exclude<NonNullable<SheetState>, { kind: 'import' }>

/** A sheet marker we can reopen: it has to come back from history.state, so check its shape. */
function asRestorable(m: unknown): RestorableSheet | null {
  if (m === null || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  if ((o['kind'] === 'edit-item' || o['kind'] === 'backdate') && typeof o['itemId'] === 'string') {
    return { kind: o['kind'], itemId: o['itemId'] }
  }
  if (o['kind'] === 'edit-record' && typeof o['recordId'] === 'string') {
    return { kind: 'edit-record', recordId: o['recordId'] }
  }
  return null
}

/** Marker value stored in history: the sheet itself, except import (a whole backup; not meant to survive). */
function markFor(s: NonNullable<SheetState>): RestorableSheet | true {
  return s.kind === 'import' ? true : s
}

class Sheets {
  current = $state.raw<SheetState>(null)

  start(): void {
    startHistory()
    // Back key / history.back(): the entry we land on decides whether a sheet is open.
    onHistorySync(() => {
      const m = sheetMark()
      if (m === undefined) this.current = null
      else if (!this.current) this.current = asRestorable(m) // forward onto a sheet entry
    })
    // Reload or tab reclaim keeps history.state: reopen the sheet that was on top (its component reloads
    // its draft). An import marker, or anything unusable, is a dead entry. Strip the marker first, so nothing
    // (home(), the back key) ever mistakes the entry for an open sheet again, even if the back below goes
    // nowhere (first entry of a standalone launch); then drop the now-duplicate entry so back is not wasted.
    const m = sheetMark()
    if (m === undefined) return
    const restored = asRestorable(m)
    if (restored) {
      this.current = restored
      return
    }
    history.replaceState(withoutSheetMark(currentState()), '')
    whenSettled(() => back())
  }

  open(s: NonNullable<SheetState>): void {
    whenSettled(() => {
      if (this.current) {
        // Swap in place, keep the single history entry, but record what is shown now.
        this.current = s
        if (sheetMark() !== undefined) history.replaceState({ ...currentState(), [SHEET_MARK]: markFor(s) }, '')
        return
      }
      this.current = s
      // Keep the page's depth on the marker entry so router.home() can still count its way back.
      history.pushState({ ...currentState(), [SHEET_MARK]: markFor(s) }, '')
    })
  }

  close(): void {
    if (!this.current) return
    this.current = null
    whenSettled(() => {
      if (sheetMark() !== undefined) back()
    })
  }

  /** Close the sheet, then run `fn` once the history entry has been popped. */
  closeThen(fn: () => void): void {
    this.current = null
    whenSettled(() => {
      if (sheetMark() !== undefined) {
        back()
        whenSettled(fn)
      } else {
        fn()
      }
    })
  }
}

export const sheets = new Sheets()
