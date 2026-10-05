import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings, SETTINGS_KEY, type KeyValueStorage } from '../src/lib/settings'
import { DEFAULT_SETTINGS } from '../src/lib/types'

function memStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

describe('settings', () => {
  it('defaults when empty', () => {
    expect(loadSettings(memStorage())).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips', () => {
    const s = memStorage()
    saveSettings({ theme: 'dark', vibrate: false, lastBackupAt: 123, backupSnoozeUntil: null }, s)
    expect(s.map.has(SETTINGS_KEY)).toBe(true)
    expect(loadSettings(s)).toEqual({ theme: 'dark', vibrate: false, lastBackupAt: 123, backupSnoozeUntil: null })
  })
  it('ignores garbage and unknown theme', () => {
    const s = memStorage()
    s.setItem(SETTINGS_KEY, '{not json')
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
    s.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'blue', vibrate: 'yes', lastBackupAt: 'x' }))
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
  })
  it.each(['42', '"dark"', 'true', 'null', '[]', '["dark"]'])('a non-object stored value (%s) falls back to defaults', (stored) => {
    const s = memStorage()
    s.setItem(SETTINGS_KEY, stored)
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
  })
})
