import type { KeyValueStorage } from './settings'

type DraftStorage = KeyValueStorage & { removeItem(key: string): void }
const PREFIX = 'lasttime.draft.'

// Accessing sessionStorage can throw (SecurityError); drafts are best-effort, so fall back to a no-op.
const noopStorage: DraftStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const defaultStorage = (): DraftStorage => {
  try {
    return globalThis.sessionStorage ?? noopStorage
  } catch {
    return noopStorage
  }
}

export function saveDraft(key: string, value: unknown, storage: DraftStorage = defaultStorage()): void {
  try {
    storage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota / private mode: drafts are best-effort
  }
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
  try {
    storage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}
