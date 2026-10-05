import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * Where the app is served (GitHub Pages project site). The only place it is written: index.html uses
 * root-relative hrefs (`/favicon.ico`) and Vite prefixes them with this base in dev and build.
 */
export const base = '/last-time/'

const isVitest = Boolean(process.env['VITEST'])

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt', // new SW waits until all tabs close; never reloads mid-use
  includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    id: base,
    name: '上次',
    short_name: '上次',
    description: '記下你上次做某件事的時間，告訴你過了幾天。',
    lang: 'zh-Hant-TW',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f4',
    theme_color: '#f6f7f4',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '新增項目', short_name: '新增', url: './?focus=1#/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
    navigateFallback: `${base}index.html`,
    cleanupOutdatedCaches: true,
  },
}

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Tests never import virtual:pwa-register, so the service-worker plugin is dead weight under vitest.
  plugins: [svelte(), ...(isVitest ? [] : [VitePWA(pwaOptions)])],
  resolve: isVitest ? { conditions: ['browser'] } : undefined,
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
