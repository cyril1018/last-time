export interface ToastAction { label: string; run: () => void }
export interface ToastState { id: number; message: string; actions: ToastAction[] }

class Toasts {
  current = $state.raw<ToastState | null>(null)
  private timer: ReturnType<typeof setTimeout> | null = null
  private seq = 0

  show(message: string, actions: ToastAction[] = [], durationMs: number = actions.length ? 8000 : 3000): void {
    if (this.timer) clearTimeout(this.timer)
    this.current = { id: ++this.seq, message, actions }
    this.timer = setTimeout(() => this.dismiss(), durationMs)
  }

  dismiss(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.current = null
  }
}

export const toasts = new Toasts()
