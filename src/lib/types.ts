export type Theme = 'system' | 'light' | 'dark'
export type Locale = 'zh-TW' | 'en'
export type LanguageSetting = 'system' | Locale

export interface Item {
  id: string
  name: string
  emoji: string
  expectDays: number | null
  archived: boolean
  created: number
}

export interface ItemRecord {
  id: string
  itemId: string
  ts: number
  note: string
}

export interface Settings {
  theme: Theme
  language: LanguageSetting
  vibrate: boolean
  lastBackupAt: number | null
  backupSnoozeUntil: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'system',
  vibrate: true,
  lastBackupAt: null,
  backupSnoozeUntil: null,
}
