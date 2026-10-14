import { toasts } from './toast.svelte'
import { sheets } from './sheet.svelte'
import { store } from './app-store'
import { vibrate } from './haptics'
import { formatClock } from './format'
import { i18n } from './i18n/i18n.svelte'
import type { LogResult } from './store.svelte'
import { saveErrorMessage } from './error-messages'

async function undo(result: LogResult): Promise<void> {
  try {
    await store.undoLog(result)
  } catch {
    toasts.show(i18n.t.log.undoFailed)
  }
}

export async function logAndToast(pending: Promise<LogResult>): Promise<LogResult | null> {
  let result: LogResult
  try {
    result = await pending
  } catch (e) {
    toasts.show(saveErrorMessage(e, i18n.locale))
    return null
  }
  vibrate(30)
  const t = i18n.t.log
  toasts.show(t.logged(result.item.emoji, result.item.name, formatClock(result.record.ts, i18n.dateLocale)), [
    { label: t.undo, run: () => void undo(result) },
    { label: t.note, run: () => sheets.open({ kind: 'edit-record', recordId: result.record.id }) },
  ])
  return result
}
