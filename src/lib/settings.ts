import { DEFAULT_SETTINGS, type Settings, type Theme } from './types'

export const SETTINGS_KEY = 'lasttime.settings'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const THEMES: readonly Theme[] = ['system', 'light', 'dark']

function defaultStorage(): KeyValueStorage {
  return globalThis.localStorage
}

export function loadSettings(storage: KeyValueStorage = defaultStorage()): Settings {
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null')
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS }
  const o = raw as Record<string, unknown>
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    theme: THEMES.includes(o['theme'] as Theme) ? (o['theme'] as Theme) : DEFAULT_SETTINGS.theme,
    vibrate: typeof o['vibrate'] === 'boolean' ? o['vibrate'] : DEFAULT_SETTINGS.vibrate,
    lastBackupAt: num(o['lastBackupAt']),
    backupSnoozeUntil: num(o['backupSnoozeUntil']),
  }
}

export function saveSettings(s: Settings, storage: KeyValueStorage = defaultStorage()): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(s))
}
