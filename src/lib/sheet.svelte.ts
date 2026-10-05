import type { ParsedBackup } from './backup'
import { SHEET_MARK, startHistory, onHistorySync, whenSettled, back, currentState, sheetMark } from './history-nav'

export type SheetState =
  | { kind: 'edit-item'; itemId: string }
  | { kind: 'edit-record'; recordId: string }
  | { kind: 'backdate'; itemId: string }
  | { kind: 'import'; backup: ParsedBackup }
  | null

class Sheets {
  current = $state.raw<SheetState>(null)

  start(): void {
    startHistory()
    // Back key / history.back(): the entry we land on decides whether a sheet is open.
    onHistorySync(() => {
      if (sheetMark() === undefined) this.current = null
    })
  }

  open(s: NonNullable<SheetState>): void {
    whenSettled(() => {
      if (this.current) {
        this.current = s // swap in place, keep the single history entry
        return
      }
      this.current = s
      // Keep the page's depth on the marker entry so router.home() can still count its way back.
      history.pushState({ ...currentState(), [SHEET_MARK]: true }, '')
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
