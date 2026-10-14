import { DuplicateNameError, EmptyNameError, FutureTimeError, InvalidTimeError } from './store.svelte'
import type { Locale } from './types'
import { messagesFor } from './i18n/messages'

/** The toast for a failed store write. Errors a given call cannot throw simply never match. */
export function saveErrorMessage(e: unknown, locale: Locale): string {
  const m = messagesFor(locale)
  if (e instanceof EmptyNameError) return m.errors.emptyName
  if (e instanceof DuplicateNameError) return m.errors.duplicateName
  if (e instanceof FutureTimeError) return m.errors.futureTime
  // Defensive: the UI only builds finite timestamps, but the store rejects anything else.
  if (e instanceof InvalidTimeError) return m.errors.invalidTime
  return m.common.saveFailed
}
