import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  base: '/last-time/',
  plugins: [svelte()],
  resolve: process.env['VITEST'] ? { conditions: ['browser'] } : undefined,
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
