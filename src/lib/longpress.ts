import type { Attachment } from 'svelte/attachments'

const MOVE_TOLERANCE_PX = 10

/** Fires `onLongPress` after `ms` of holding without moving; suppresses the trailing click and context menu. */
export function longpress(opts: { ms?: number; onLongPress: () => void }): Attachment<HTMLElement> {
  const ms = opts.ms ?? 450
  return (node) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let startX = 0
    let startY = 0
    let fired = false

    const clear = () => { if (timer) { clearTimeout(timer); timer = null } }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      fired = false
      startX = e.clientX
      startY = e.clientY
      clear()
      timer = setTimeout(() => { timer = null; fired = true; opts.onLongPress() }, ms)
    }
    const onMove = (e: PointerEvent) => {
      if (timer && (Math.abs(e.clientX - startX) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - startY) > MOVE_TOLERANCE_PX)) clear()
    }
    const onClick = (e: MouseEvent) => {
      if (fired) { e.preventDefault(); e.stopImmediatePropagation(); fired = false }
    }
    const onContext = (e: Event) => e.preventDefault()

    node.addEventListener('pointerdown', onDown)
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerup', clear)
    node.addEventListener('pointercancel', clear)
    node.addEventListener('pointerleave', clear)
    node.addEventListener('click', onClick, true)
    node.addEventListener('contextmenu', onContext)
    return () => {
      clear()
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerup', clear)
      node.removeEventListener('pointercancel', clear)
      node.removeEventListener('pointerleave', clear)
      node.removeEventListener('click', onClick, true)
      node.removeEventListener('contextmenu', onContext)
    }
  }
}
