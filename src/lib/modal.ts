const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Touch-first device: focusing a field there raises the on-screen keyboard and halves the sheet. */
function touch(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

export interface ModalOptions {
  /** Escape pressed while the dialog is open. */
  onEscape: () => void
  /**
   * Selector inside the dialog whose first focusable gets focus on open; the dialog itself when none.
   * On a touch device (coarse pointer) the dialog itself always gets it, so the keyboard does not pop up.
   */
  initialFocusWithin?: string
}

/**
 * Attachment for an `aria-modal` dialog: focus moves in on open, Tab / Shift+Tab cycle inside it, Escape
 * calls `onEscape`, and focus goes back to the element that had it before, if that is still in the page.
 * The dialog element needs tabindex="-1" so it can hold focus itself.
 */
export function modal(opts: ModalOptions): (node: HTMLElement) => () => void {
  return (node) => {
    const active = document.activeElement
    const opener = active instanceof HTMLElement && active !== document.body ? active : null

    const scope = touch() ? null : opts.initialFocusWithin ? node.querySelector(opts.initialFocusWithin) : node
    ;(scope?.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        opts.onEscape()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        e.preventDefault()
        node.focus()
        return
      }
      const cur = document.activeElement
      const inside = cur instanceof Node && node.contains(cur)
      if (e.shiftKey ? !inside || cur === first || cur === node : !inside || cur === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus()
    }
  }
}
