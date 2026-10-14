import { describe, it, expect } from 'vitest'
import type { PluginOption } from 'vite'
import config, { base, pwaOptions, enManifest } from '../vite.config'
import { MANIFEST_FILE } from '../src/lib/i18n/locale'

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

  it('names the Chinese manifest file explicitly', () => {
    expect(pwaOptions.manifestFilename).toBe(MANIFEST_FILE['zh-TW'])
  })

  it('derives the English manifest from the Chinese one, changing only the words', () => {
    const zh = pwaOptions.manifest as Record<string, unknown>
    expect(enManifest.name).toBe('Last Time')
    expect(enManifest.short_name).toBe('Last Time')
    expect(enManifest.lang).toBe('en')
    expect(enManifest.description).toBe('Track how many days since you last did something.')
    for (const k of ['id', 'start_url', 'scope', 'display', 'orientation', 'background_color', 'theme_color', 'icons']) {
      expect(enManifest[k as keyof typeof enManifest]).toEqual(zh[k])
    }
    const [zs] = zh['shortcuts'] as { url: string; icons: unknown }[]
    const [es] = enManifest.shortcuts!
    expect(es).toMatchObject({ name: 'Add item', short_name: 'Add', url: zs!.url, icons: zs!.icons })
  })
})
