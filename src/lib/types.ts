export type Theme = 'system' | 'light' | 'dark'

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
  vibrate: boolean
  lastBackupAt: number | null
  backupSnoozeUntil: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  vibrate: true,
  lastBackupAt: null,
  backupSnoozeUntil: null,
}
