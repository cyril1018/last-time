import type { KeyValueStorage } from './settings'

type DraftStorage = KeyValueStorage & { removeItem(key: string): void }
const PREFIX = 'lasttime.draft.'
const defaultStorage = (): DraftStorage => globalThis.sessionStorage

export function saveDraft(key: string, value: unknown, storage: DraftStorage = defaultStorage()): void {
  storage.setItem(PREFIX + key, JSON.stringify(value))
}

export function loadDraft<T>(key: string, storage: DraftStorage = defaultStorage()): T | null {
  try {
    const raw = storage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function clearDraft(key: string, storage: DraftStorage = defaultStorage()): void {
  storage.removeItem(PREFIX + key)
}
