import { toasts } from './toast.svelte'
import { sheets } from './sheet.svelte'
import { store } from './app-store'
import { vibrate } from './haptics'
import { formatTime } from './format'
import { EmptyNameError, FutureTimeError, type LogResult } from './store.svelte'

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
    const msg = e instanceof EmptyNameError ? '請輸入名稱' : e instanceof FutureTimeError ? '時間不能是未來' : '儲存失敗，請再試一次'
    toasts.show(msg)
    return null
  }
  vibrate(30)
  toasts.show(`已記錄 ${result.item.emoji} ${result.item.name} ${formatTime(result.record.ts)}`, [
    { label: '復原', run: () => void undo(result) },
    { label: '備註', run: () => sheets.open({ kind: 'edit-record', recordId: result.record.id }) },
  ])
  return result
}
