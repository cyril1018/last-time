import type { ParsedBackup } from './backup'

export type SheetState =
  | { kind: 'edit-item'; itemId: string }
  | { kind: 'edit-record'; recordId: string }
  | { kind: 'backdate'; itemId: string }
  | { kind: 'import'; backup: ParsedBackup }
  | null

const MARK = 'lasttime-sheet'

class Sheets {
  current = $state.raw<SheetState>(null)

  start(): void {
    // Back key / history.back() closes an open sheet.
    window.addEventListener('popstate', () => {
      if (this.current) this.current = null
    })
  }

  open(s: NonNullable<SheetState>): void {
    if (this.current) {
      this.current = s // swap in place, keep the single history entry
      return
    }
    this.current = s
    history.pushState({ [MARK]: true }, '')
  }

  close(): void {
    if (!this.current) return
    this.current = null
    if (history.state && history.state[MARK]) history.back()
  }

  /** Close the sheet, then run `fn` once the history entry has been popped. */
  closeThen(fn: () => void): void {
    if (!this.current) { fn(); return }
    this.current = null
    if (history.state && history.state[MARK]) {
      window.addEventListener('popstate', () => fn(), { once: true })
      history.back()
    } else {
      fn()
    }
  }
}

export const sheets = new Sheets()
