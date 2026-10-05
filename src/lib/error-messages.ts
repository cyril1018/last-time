import { DuplicateNameError, EmptyNameError, FutureTimeError, InvalidTimeError } from './store.svelte'

/** The toast for a failed store write. Errors a given call cannot throw simply never match. */
export function saveErrorMessage(e: unknown): string {
  if (e instanceof EmptyNameError) return '請輸入名稱'
  if (e instanceof DuplicateNameError) return '已有同名項目'
  if (e instanceof FutureTimeError) return '時間不能是未來'
  // Defensive: the UI only builds finite timestamps, but the store rejects anything else.
  if (e instanceof InvalidTimeError) return '時間格式不正確'
  return '儲存失敗，請再試一次'
}
