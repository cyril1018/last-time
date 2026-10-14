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
    toasts.show('復原失敗')
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
  toasts.show(`已記錄 ${result.item.emoji} ${result.item.name} ${formatClock(result.record.ts, i18n.dateLocale)}`, [
    { label: '復原', run: () => void undo(result) },
    { label: '備註', run: () => sheets.open({ kind: 'edit-record', recordId: result.record.id }) },
  ])
  return result
}
