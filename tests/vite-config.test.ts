import { describe, it, expect } from 'vitest'
import type { PluginOption } from 'vite'
import config, { base, pwaOptions } from '../vite.config'

function pluginNames(ps: PluginOption[] | undefined): string[] {
  return (ps ?? []).flat(Infinity as 1).flatMap((p) => (p && typeof p === 'object' && 'name' in p ? [p.name] : []))
}

describe('vite.config', () => {
  it('defines the base once and derives the rest from it', () => {
    expect(base).toBe('/last-time/')
    expect(config.base).toBe(base)
    expect(pwaOptions.workbox?.navigateFallback).toBe(`${base}index.html`)
    expect(pwaOptions.manifest && pwaOptions.manifest.id).toBe(base)
  })

  it('leaves the PWA plugin out under vitest', () => {
    const names = pluginNames(config.plugins)
    expect(names.some((n) => n.startsWith('vite-plugin-svelte'))).toBe(true)
    expect(names.filter((n) => n.includes('pwa'))).toEqual([])
  })
})
