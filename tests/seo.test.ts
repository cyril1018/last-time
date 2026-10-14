import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const meta = (attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1]

const TITLE = '上次 Last Time — 記下上次做某件事過了幾天'
const DESCRIPTION = '記下你上次做某件事的時間，打開就看到過了幾天。長按記一筆，可離線使用，免帳號，資料只存在你的手機。Track how many days since you last did something — offline, no account, your data stays on your phone.'

describe('index.html SEO (spec §7.1)', () => {
  it('has the bilingual title and description', () => {
    expect(html).toContain(`<title>${TITLE}</title>`)
    expect(meta('name', 'description')).toBe(DESCRIPTION)
  })
  it('has Open Graph and Twitter card tags with absolute URLs', () => {
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:site_name')).toBe('上次 Last Time')
    expect(meta('property', 'og:title')).toBe(TITLE)
    expect(meta('property', 'og:description')).toBe(DESCRIPTION)
    expect(meta('property', 'og:url')).toBe('https://cyril1018.github.io/last-time/')
    expect(meta('property', 'og:image')).toBe('https://cyril1018.github.io/last-time/pwa-512x512.png')
    expect(meta('property', 'og:locale')).toBe('zh_TW')
    expect(meta('property', 'og:locale:alternate')).toBe('en_US')
    expect(meta('name', 'twitter:card')).toBe('summary')
  })
  it('keeps zh-Hant-TW as the static <html lang>', () => {
    expect(html).toContain('<html lang="zh-Hant-TW">')
  })
})
