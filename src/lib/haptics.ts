import { store } from './app-store'

export function vibrate(ms = 30): void {
  if (!store.settings.vibrate) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms)
}
