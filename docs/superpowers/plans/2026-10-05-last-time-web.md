# 「上次」網頁版 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一個離線可用、可加到 Android 主畫面的 PWA「上次」：記下上次做某件事的時間，顯示過了幾天，長按記一筆、可復原、可備份成 JSON。

**Architecture:** 單頁 Svelte 5 app，hash 路由三個頁面（首頁、項目細節、設定）加四個底部抽屜。啟動時把 IndexedDB（Dexie）兩張表全部讀進一個 `$state` store，畫面只讀 store；每次修改先改 store 再寫 DB。所有計算規則、emoji 猜測、備份解析都是 `src/lib/` 下的純函式，用 Vitest 測。vite-plugin-pwa 產生 Service Worker 與 manifest；GitHub Actions 推 `main` 自動測試、打包、部署到 GitHub Pages。

**Tech Stack:** TypeScript 6、Svelte 5（runes）、Vite 8、Vitest 5、Dexie 4、fake-indexeddb 6、vite-plugin-pwa 2、Fraunces 可變字型（OFL）。Node 24、npm 11。

**Spec:** `docs/superpowers/specs/2026-10-05-last-time-web-design.md`

## Global Constraints

- 介面文字一律繁體中文（台灣用語）。程式碼、commit message 用英文。
- 不宣告、不呼叫任何對外網路請求；不引入分析、廣告、錯誤回報 SDK。字型隨網站打包，不連 Google Fonts。
- 依賴授權只能是 MIT、Apache-2.0、OFL（字型）。
- TypeScript `strict: true`；`svelte-check` 零錯誤；`npm test` 全綠才能 commit。
- id 為 13 碼 `[0-9a-z]`；時間存 epoch 毫秒；「過了幾天」用裝置時區的日曆日差。
- 備份格式：`{ app: "lasttime", version: 1, exportedAt, items, records, settings }`，無 `cats`、`catId`、`photos`、`hasPhoto`。
- 所有字級用 rem；主色綠、到期紅、淺色底；深色模式跟隨系統可手動切換。
- Vite `base` 為 `/last-time/`；網址 `https://cyril1018.github.io/last-time/`。
- git 作者固定為 `Ted <38046383+cyril1018@users.noreply.github.com>`（repo 本地設定已存在，勿改 `--global`）。commit message 結尾加 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`。推送前執行 `git log --format='%an <%ae>' | sort -u` 確認只有這一個身分。

## Review Focus

1. 名稱只有空白或頭尾帶空白：「 吃藥 」要視為與「吃藥」相同的項目，純空白不能新增。→ Task 8 測 `normalizeName` 與 `addItemAndLog`。
2. 編輯紀錄時選到未來時間：儲存必須被拒絕，不能寫進 DB。→ Task 8 測 `addRecord` / `updateRecord` 丟 `FutureTimeError`。
3. 「大概多久一次」輸入 `0`、`-3`、`2.5`、`abc`：一律視為留空（null），不能造成永遠到期或 NaN。→ Task 4 測 `normalizeExpectDays`。
4. 匯入的檔案不是 JSON、或是 JSON 但不是備份：都要回「不是『上次』的備份檔」，不能噴例外。→ Task 7 測 `parseBackup` 兩種壞輸入。
5. 復原提示還掛著時項目已被刪除（例如使用者快速進細節頁刪掉）：按「復原」不能炸。→ Task 8 測 `undoLog` 對不存在的紀錄是 no-op。

## 檔案結構

```
package.json, tsconfig.json, vite.config.ts, svelte.config.js, index.html
src/
  main.ts                 掛載 App、註冊 SW、requestPersist
  app.css                 CSS 變數（淺/深）、@font-face Fraunces、全域樣式
  App.svelte              主題套用、路由切換、Toast 與 Sheet 宿主
  lib/
    types.ts              Item、ItemRecord、Settings、Theme
    ids.ts                newId()
    emoji.ts              guessEmoji()、QUICK_EMOJIS
    calc.ts               日曆日差、距上次、字級字重、到期、7 天、平均間隔、空缺、備份提醒
    format.ts             日期時間文字、備份檔名
    settings.ts           Settings 讀寫（可注入 Storage）
    db.ts                 Dexie 定義與 CRUD
    backup.ts             serializeBackup、parseBackup、planMerge、planReplace、summarize
    store.svelte.ts       Store 類別：記憶體狀態 + 所有資料操作
    router.svelte.ts      hash 路由、navigate、back
    sheet.svelte.ts       抽屜開關狀態（配合 history 讓返回鍵關抽屜）
    toast.svelte.ts       底部提示狀態
    haptics.ts            vibrate()
    longpress.ts          Svelte attachment：長按
    draft.ts              sessionStorage 草稿存取
  components/
    Home.svelte, ItemRow.svelte, EmptyState.svelte, BackupBanner.svelte, SearchBar.svelte
    ItemDetail.svelte, Timeline.svelte
    Sheet.svelte, EditItemSheet.svelte, EditRecordSheet.svelte, BackdateSheet.svelte, MonthCalendar.svelte
    Settings.svelte, ImportSheet.svelte
    Toast.svelte
  assets/fonts/Fraunces-latin.woff2, OFL.txt
public/icon.svg + 產生的 PNG icon、.nojekyll
tests/
  setup.ts（固定 TZ=Asia/Taipei）
  ids.test.ts, emoji.test.ts, calc.test.ts, format.test.ts, settings.test.ts, db.test.ts, backup.test.ts, store.test.ts
.github/workflows/deploy.yml
README.md
```

---

### Task 1: 專案骨架與工具鏈

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `svelte.config.js`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`, `tests/setup.ts`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`、`npm test`、`npm run check`、`npm run build` 四個指令可用；Vitest 讀 `tests/**/*.test.ts`，TZ 固定 Asia/Taipei；`.svelte.ts` 檔在測試裡可用 runes。

- [ ] **Step 1: 建 package.json**

```json
{
  "name": "last-time",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "dexie": "^4.4.6"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^7.3.1",
    "@tsconfig/svelte": "^5.0.8",
    "fake-indexeddb": "^6.2.5",
    "svelte": "^5.57.1",
    "svelte-check": "^4.7.6",
    "typescript": "~6.0.3",
    "vite": "^8.3.2",
    "vite-plugin-pwa": "^2.0.0",
    "vitest": "^5.0.3",
    "workbox-build": "^7.4.1",
    "workbox-window": "^7.4.1"
  }
}
```

TypeScript 用 6.x：svelte-check 4.7 的 peer 範圍是 `^5 || ^6`，不支援 7。

- [ ] **Step 2: 安裝**

Run: `npm install`
Expected: 無 ERESOLVE 錯誤；產生 `package-lock.json`、`node_modules/`。

- [ ] **Step 3: tsconfig.json、svelte.config.js、vite-env.d.ts**

`tsconfig.json`:
```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts", "vite.config.ts"]
}
```

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
export default { preprocess: vitePreprocess() }
```

`src/vite-env.d.ts`:
```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 4: vite.config.ts（含 Vitest 設定；PWA 設定先留最小，Task 16 補完）**

```ts
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
```

`resolve.conditions: ['browser']` 讓 Svelte 5 的 runes 在 Vitest 裡走瀏覽器版，`.svelte.ts` 的 `$state` 才能用。

- [ ] **Step 5: tests/setup.ts 固定時區**

```ts
process.env['TZ'] = 'Asia/Taipei'
```

- [ ] **Step 6: index.html、app.css、main.ts、App.svelte 最小版**

`index.html`:
```html
<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
    <meta name="theme-color" content="#f6f7f4" />
    <title>上次</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/app.css`（先放變數與 reset，字型在 Task 9 加）:
```css
:root {
  --bg: #f6f7f4;
  --surface: #ffffff;
  --text: #1c1f1a;
  --muted: #6b7266;
  --line: #e3e6df;
  --accent: #2f8f5b;
  --accent-soft: #dff3e7;
  --danger: #c43d3d;
  --toast-bg: #1c1f1a;
  --toast-text: #ffffff;
  --radius: 14px;
  color-scheme: light;
}
:root[data-theme='dark'] {
  --bg: #121411;
  --surface: #1b1e19;
  --text: #ecefe8;
  --muted: #9aa294;
  --line: #2a2e27;
  --accent: #5fc18a;
  --accent-soft: #1f3a2b;
  --danger: #ff6b6b;
  --toast-bg: #ecefe8;
  --toast-text: #121411;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, 'Noto Sans TC', sans-serif; font-size: 100%; -webkit-text-size-adjust: 100%; }
button, input, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; }
```

`src/main.ts`:
```ts
import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'

mount(App, { target: document.getElementById('app')! })
```

`src/App.svelte`:
```svelte
<main>
  <h1>上次</h1>
</main>
```

- [ ] **Step 7: smoke test**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('environment', () => {
  it('runs in Asia/Taipei', () => {
    expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(-480)
  })
})
```

Run: `npm test`
Expected: 1 passed。

- [ ] **Step 8: check 與 build**

Run: `npm run check && npm run build`
Expected: svelte-check 0 errors；`dist/index.html` 存在，內含 `/last-time/assets/`。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Vite + Svelte 5 + TypeScript project with Vitest

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 型別與 id 產生

**Files:**
- Create: `src/lib/types.ts`, `src/lib/ids.ts`
- Test: `tests/ids.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type Theme = 'system' | 'light' | 'dark'
  export interface Item { id: string; name: string; emoji: string; expectDays: number | null; archived: boolean; created: number }
  export interface ItemRecord { id: string; itemId: string; ts: number; note: string }
  export interface Settings { theme: Theme; vibrate: boolean; lastBackupAt: number | null; backupSnoozeUntil: number | null }
  export const DEFAULT_SETTINGS: Settings
  // ids.ts
  export const ID_PATTERN: RegExp   // /^[0-9a-z]{13}$/
  export function newId(now?: number, rand?: () => number): string
  ```

- [ ] **Step 1: types.ts**

```ts
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
```

- [ ] **Step 2: 失敗測試**

`tests/ids.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { newId, ID_PATTERN } from '../src/lib/ids'

describe('newId', () => {
  it('is 13 lowercase base36 chars', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(ID_PATTERN)
  })
  it('is unique across many calls', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId()))
    expect(ids.size).toBe(2000)
  })
  it('is deterministic given time and rand', () => {
    const a = newId(1791139600000, () => 0.5)
    const b = newId(1791139600000, () => 0.5)
    expect(a).toBe(b)
    expect(a).toHaveLength(13)
  })
})
```

Run: `npx vitest run tests/ids.test.ts`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作**

`src/lib/ids.ts`:
```ts
export const ID_PATTERN = /^[0-9a-z]{13}$/

/** 13-char base36 id: time prefix + random tail. */
export function newId(now: number = Date.now(), rand: () => number = Math.random): string {
  const time = now.toString(36)
  let tail = ''
  while (time.length + tail.length < 13) {
    tail += Math.floor(rand() * 36).toString(36)
  }
  return (time + tail).slice(0, 13)
}
```

- [ ] **Step 4: 跑測試**

Run: `npx vitest run tests/ids.test.ts`
Expected: 3 passed。

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/ids.ts tests/ids.test.ts
git commit -m "Add data types and 13-char id generator

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 猜 emoji

**Files:**
- Create: `src/lib/emoji.ts`
- Test: `tests/emoji.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const DEFAULT_EMOJI = '📌'
  export const QUICK_EMOJIS: readonly string[]   // 20 個，給編輯項目抽屜
  export function guessEmoji(name: string): string
  ```

- [ ] **Step 1: 失敗測試**

`tests/emoji.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { guessEmoji, QUICK_EMOJIS, DEFAULT_EMOJI } from '../src/lib/emoji'

describe('guessEmoji', () => {
  it.each([
    ['洗床單', '🛏️'],
    ['打電話給爸媽', '📞'],
    ['剪頭髮', '✂️'],
    ['幫盆栽澆水', '🪴'],
    ['換飲水機濾心', '💧'],
    ['洗車', '🚗'],
    ['加油', '⛽'],
    ['跑步', '🏃'],
    ['看牙醫', '🦷'],
    ['吃藥', '💊'],
    ['倒垃圾', '🗑️'],
    ['掃地', '🧹'],
    ['洗衣服', '🫧'],
    ['餵貓', '🐱'],
    ['清冷氣', '❄️'],
    ['繳帳單', '🧾'],
    ['換電池', '🔋'],
    ['跟朋友聚餐', '🍻'],
    ['清冰箱', '🧊'],
    ['修水管', '🔧'],
    ['換瓦斯', '🔥'],
    ['轉帳給幣托扣款帳戶', '💸'],
    ['換床墊套', '🛏️'],
    ['換燈泡', '💡'],
    ['換機油', '🔄'],
  ])('%s → %s', (name, emoji) => {
    expect(guessEmoji(name)).toBe(emoji)
  })

  it('falls back to 📌', () => {
    expect(guessEmoji('整理抽屜')).toBe(DEFAULT_EMOJI)
    expect(guessEmoji('')).toBe(DEFAULT_EMOJI)
  })

  it('earlier rules win: 洗車 is car not bubbles, 吃藥 is pill not food', () => {
    expect(guessEmoji('洗車')).toBe('🚗')
    expect(guessEmoji('吃藥')).toBe('💊')
  })
})

describe('QUICK_EMOJIS', () => {
  it('has 20 unique entries including the default', () => {
    expect(QUICK_EMOJIS).toHaveLength(20)
    expect(new Set(QUICK_EMOJIS).size).toBe(20)
    expect(QUICK_EMOJIS).toContain(DEFAULT_EMOJI)
  })
})
```

Run: `npx vitest run tests/emoji.test.ts`
Expected: FAIL。

- [ ] **Step 2: 實作**

`src/lib/emoji.ts`:
```ts
export const DEFAULT_EMOJI = '📌'

/** Ordered: first keyword hit wins. */
const RULES: ReadonlyArray<readonly [string[], string]> = [
  [['床單', '棉被', '枕', '床'], '🛏️'],
  [['電話', '爸', '媽'], '📞'],
  [['剪'], '✂️'],
  [['頭髮'], '💇'],
  [['澆', '盆栽', '植'], '🪴'],
  [['花'], '🌸'],
  [['濾'], '💧'],
  [['洗車', '車'], '🚗'],
  [['加油'], '⛽'],
  [['跑'], '🏃'],
  [['健身'], '🏋️'],
  [['游泳'], '🏊'],
  [['牙'], '🦷'],
  [['醫', '健檢'], '🩺'],
  [['藥'], '💊'],
  [['垃圾'], '🗑️'],
  [['掃', '拖'], '🧹'],
  [['洗'], '🫧'],
  [['貓'], '🐱'],
  [['狗'], '🐶'],
  [['魚'], '🐟'],
  [['冷氣'], '❄️'],
  [['書'], '📚'],
  [['電影'], '🎬'],
  [['旅'], '✈️'],
  [['按摩'], '💆'],
  [['繳'], '🧾'],
  [['電池'], '🔋'],
  [['燈'], '💡'],
  [['朋友', '聚'], '🍻'],
  [['吃'], '🍜'],
  [['冰箱'], '🧊'],
  [['窗'], '🪟'],
  [['修'], '🔧'],
  [['瓦斯'], '🔥'],
  [['轉帳', '匯款', '帳戶'], '💸'],
  [['換'], '🔄'],
]

export function guessEmoji(name: string): string {
  for (const [keywords, emoji] of RULES) {
    if (keywords.some((k) => name.includes(k))) return emoji
  }
  return DEFAULT_EMOJI
}

export const QUICK_EMOJIS: readonly string[] = [
  '📌', '🛏️', '📞', '💊', '💧', '🔥', '💸', '🧹', '🫧', '🚗',
  '🏃', '🦷', '🩺', '🗑️', '🪴', '🍜', '🧾', '🔋', '💡', '🔧',
]
```

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/emoji.test.ts`
Expected: 全部 passed。

- [ ] **Step 4: Commit**

```bash
git add src/lib/emoji.ts tests/emoji.test.ts
git commit -m "Add keyword-based emoji guessing

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 計算規則 calc.ts

**Files:**
- Create: `src/lib/calc.ts`
- Test: `tests/calc.test.ts`

**Interfaces:**
- Consumes: `Item`, `ItemRecord` from `types.ts`
- Produces:
  ```ts
  export const DAY_MS = 86_400_000
  export function startOfDay(ms: number): number
  export function calendarDaysBetween(earlier: number, later: number): number
  export type SinceKind = 'now' | 'hours' | 'days'
  export interface Since { kind: SinceKind; value: number; days: number }
  export function since(ts: number, now: number): Since
  export function sinceParts(s: Since): { number: string; unit: string }   // 剛剛→{number:'剛剛',unit:''}
  export function numberStyle(s: Since): { fontSizePx: number; fontWeight: number }
  export function isDue(expectDays: number | null, s: Since): boolean
  export function normalizeExpectDays(input: unknown): number | null
  export function normalizeName(input: string): string
  export function lastTsByItem(records: ItemRecord[]): Map<string, number>
  export function sortItemsForHome(items: Item[], lastTs: Map<string, number>): Item[]   // 只含未封存
  export function recent7(items: Item[], lastTs: Map<string, number>, now: number): { done: number; total: number }
  export function averageIntervalDays(tss: number[]): number | null
  export function formatIntervalDays(days: number): string
  export function gapsBetween(tssDesc: number[]): number[]   // 相鄰兩筆日曆日差，長度 = n-1
  export function backupBannerVisible(recordCount: number, s: { lastBackupAt: number | null; backupSnoozeUntil: number | null }, now: number): boolean
  ```

- [ ] **Step 1: 失敗測試**

`tests/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  startOfDay, calendarDaysBetween, since, sinceParts, numberStyle, isDue,
  normalizeExpectDays, normalizeName, lastTsByItem, sortItemsForHome, recent7,
  averageIntervalDays, formatIntervalDays, gapsBetween, backupBannerVisible, DAY_MS,
} from '../src/lib/calc'
import type { Item, ItemRecord } from '../src/lib/types'

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime()

describe('calendar days', () => {
  it('startOfDay is local midnight', () => {
    expect(startOfDay(at(2026, 9, 20, 14, 32))).toBe(at(2026, 9, 20))
  })
  it('23:00 yesterday → 00:30 today is 1 day', () => {
    expect(calendarDaysBetween(at(2026, 9, 19, 23), at(2026, 9, 20, 0, 30))).toBe(1)
  })
  it('same day is 0', () => {
    expect(calendarDaysBetween(at(2026, 9, 20, 1), at(2026, 9, 20, 23))).toBe(0)
  })
  it('across a DST change still counts whole days', () => {
    const prev = process.env['TZ']
    process.env['TZ'] = 'America/New_York'
    try {
      // 2026-03-08 is the US spring-forward date
      expect(calendarDaysBetween(new Date(2026, 2, 7, 12).getTime(), new Date(2026, 2, 9, 12).getTime())).toBe(2)
    } finally {
      process.env['TZ'] = prev
    }
  })
})

describe('since', () => {
  const now = at(2026, 9, 20, 14, 32)
  it('< 60 min is 剛剛', () => {
    const s = since(now - 59 * 60_000, now)
    expect(s.kind).toBe('now')
    expect(sinceParts(s)).toEqual({ number: '剛剛', unit: '' })
  })
  it('same calendar day ≥ 60 min is N 小時', () => {
    const s = since(at(2026, 9, 20, 9, 0), now)
    expect(s).toMatchObject({ kind: 'hours', value: 5, days: 0 })
    expect(sinceParts(s)).toEqual({ number: '5', unit: '小時' })
  })
  it('yesterday late night is 1 天 even if < 24h', () => {
    const s = since(at(2026, 9, 19, 23, 50), at(2026, 9, 20, 0, 10))
    expect(s).toMatchObject({ kind: 'days', value: 1, days: 1 })
    expect(sinceParts(s)).toEqual({ number: '1', unit: '天' })
  })
  it('future timestamps clamp to 剛剛', () => {
    expect(since(now + 5 * 60_000, now).kind).toBe('now')
  })
})

describe('numberStyle', () => {
  it('剛剛 and hours are fixed 18px / 420', () => {
    expect(numberStyle({ kind: 'now', value: 0, days: 0 })).toEqual({ fontSizePx: 18, fontWeight: 420 })
    expect(numberStyle({ kind: 'hours', value: 3, days: 0 })).toEqual({ fontSizePx: 18, fontWeight: 420 })
  })
  it('grows with log2 and caps at 44px / 680', () => {
    const d = (days: number) => numberStyle({ kind: 'days', value: days, days })
    expect(d(1).fontSizePx).toBeCloseTo(28, 5)       // 22 + 6*log2(2)
    expect(d(7).fontSizePx).toBeCloseTo(40, 5)       // 22 + 6*3
    expect(d(120).fontSizePx).toBe(44)
    expect(d(1).fontWeight).toBe(424)
    expect(d(30).fontWeight).toBe(540)
    expect(d(200).fontWeight).toBe(680)
    expect(d(1).fontSizePx).toBeLessThan(d(7).fontSizePx)
    expect(d(7).fontSizePx).toBeLessThan(d(30).fontSizePx)
    expect(d(30).fontSizePx).toBeLessThan(d(120).fontSizePx)
  })
})

describe('isDue', () => {
  it('null expectDays never due', () => {
    expect(isDue(null, { kind: 'days', value: 400, days: 400 })).toBe(false)
  })
  it('due when days ≥ expectDays', () => {
    expect(isDue(14, { kind: 'days', value: 14, days: 14 })).toBe(true)
    expect(isDue(14, { kind: 'days', value: 13, days: 13 })).toBe(false)
  })
  it('same-day (hours/now) is never due even with expectDays 1', () => {
    expect(isDue(1, { kind: 'hours', value: 5, days: 0 })).toBe(false)
    expect(isDue(1, { kind: 'now', value: 0, days: 0 })).toBe(false)
  })
})

describe('normalizeExpectDays', () => {
  it.each([
    [14, 14], ['14', 14], [' 7 ', 7],
    [0, null], [-3, null], [2.5, null], ['abc', null], ['', null], [null, null], [undefined, null], [NaN, null], [Infinity, null],
  ])('%p → %p', (input, expected) => {
    expect(normalizeExpectDays(input)).toBe(expected)
  })
})

describe('normalizeName', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeName('  吃藥 ')).toBe('吃藥')
    expect(normalizeName('打電話  給  媽')).toBe('打電話 給 媽')
    expect(normalizeName('   ')).toBe('')
  })
})

const item = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 0, ...over })
const rec = (id: string, itemId: string, ts: number): ItemRecord => ({ id, itemId, ts, note: '' })

describe('home list', () => {
  const now = at(2026, 9, 20, 12)
  const items = [item('a'), item('b'), item('c'), item('z', { archived: true }), item('n')]
  const records = [
    rec('r1', 'a', at(2026, 9, 1)), rec('r2', 'a', at(2026, 9, 18)),
    rec('r3', 'b', at(2026, 9, 19)),
    rec('r4', 'c', at(2026, 8, 1)),
    rec('r5', 'z', at(2026, 9, 20)),
  ]
  const last = lastTsByItem(records)
  it('lastTsByItem keeps the max ts per item', () => {
    expect(last.get('a')).toBe(at(2026, 9, 18))
    expect(last.has('n')).toBe(false)
  })
  it('sorts most recent first, unrecorded last, archived excluded', () => {
    expect(sortItemsForHome(items, last).map((i) => i.id)).toEqual(['b', 'a', 'c', 'n'])
  })
  it('recent7 counts unarchived items with a record in the last 7×24h', () => {
    expect(recent7(items, last, now)).toEqual({ done: 2, total: 4 })
  })
})

describe('intervals and gaps', () => {
  it('needs at least 3 records', () => {
    expect(averageIntervalDays([at(2026, 9, 1), at(2026, 9, 10)])).toBeNull()
  })
  it('(latest − earliest) / (n − 1) in days, order-independent', () => {
    const tss = [at(2026, 9, 10), at(2026, 9, 1), at(2026, 9, 19)]
    expect(averageIntervalDays(tss)).toBeCloseTo(9, 5)
  })
  it('formats < 10 with one decimal, else integer', () => {
    expect(formatIntervalDays(9.26)).toBe('9.3')
    expect(formatIntervalDays(14.6)).toBe('15')
    expect(formatIntervalDays(10)).toBe('10')
  })
  it('gapsBetween returns calendar-day gaps for a newest-first list', () => {
    expect(gapsBetween([at(2026, 9, 20, 8), at(2026, 9, 20, 7), at(2026, 9, 6, 23)])).toEqual([0, 14])
    expect(gapsBetween([at(2026, 9, 20)])).toEqual([])
  })
})

describe('backupBannerVisible', () => {
  const now = at(2026, 10, 5, 9)
  it('hidden under 5 records', () => {
    expect(backupBannerVisible(4, { lastBackupAt: null, backupSnoozeUntil: null }, now)).toBe(false)
  })
  it('shown at 5 records never backed up', () => {
    expect(backupBannerVisible(5, { lastBackupAt: null, backupSnoozeUntil: null }, now)).toBe(true)
  })
  it('shown when last backup older than 14 days, hidden if newer', () => {
    expect(backupBannerVisible(50, { lastBackupAt: now - 15 * DAY_MS, backupSnoozeUntil: null }, now)).toBe(true)
    expect(backupBannerVisible(50, { lastBackupAt: now - 13 * DAY_MS, backupSnoozeUntil: null }, now)).toBe(false)
  })
  it('snooze hides until the snooze time passes', () => {
    expect(backupBannerVisible(50, { lastBackupAt: null, backupSnoozeUntil: now + 1 }, now)).toBe(false)
    expect(backupBannerVisible(50, { lastBackupAt: null, backupSnoozeUntil: now - 1 }, now)).toBe(true)
  })
})
```

Run: `npx vitest run tests/calc.test.ts`
Expected: FAIL（模組不存在）。

- [ ] **Step 2: 實作**

`src/lib/calc.ts`:
```ts
import type { Item, ItemRecord } from './types'

export const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const BACKUP_STALE_DAYS = 14
const BACKUP_MIN_RECORDS = 5

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole calendar days from `earlier` to `later` in the device time zone. Robust to DST (rounds). */
export function calendarDaysBetween(earlier: number, later: number): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / DAY_MS)
}

export type SinceKind = 'now' | 'hours' | 'days'
export interface Since {
  kind: SinceKind
  /** Hours for 'hours', days for 'days', 0 for 'now'. */
  value: number
  /** Calendar-day difference, always present. */
  days: number
}

export function since(ts: number, now: number): Since {
  const days = Math.max(0, calendarDaysBetween(ts, now))
  const elapsed = now - ts
  if (elapsed < HOUR_MS) return { kind: 'now', value: 0, days: 0 }
  if (days === 0) return { kind: 'hours', value: Math.floor(elapsed / HOUR_MS), days: 0 }
  return { kind: 'days', value: days, days }
}

export function sinceParts(s: Since): { number: string; unit: string } {
  if (s.kind === 'now') return { number: '剛剛', unit: '' }
  if (s.kind === 'hours') return { number: String(s.value), unit: '小時' }
  return { number: String(s.value), unit: '天' }
}

export function numberStyle(s: Since): { fontSizePx: number; fontWeight: number } {
  if (s.kind !== 'days') return { fontSizePx: 18, fontWeight: 420 }
  const fontSizePx = Math.min(44, 22 + 6 * Math.log2(s.days + 1))
  const fontWeight = Math.min(680, 420 + s.days * 4)
  return { fontSizePx, fontWeight }
}

export function isDue(expectDays: number | null, s: Since): boolean {
  return expectDays !== null && s.kind === 'days' && s.days >= expectDays
}

/** Positive integer or null. Accepts numbers and numeric strings. */
export function normalizeExpectDays(input: unknown): number | null {
  let n: number
  if (typeof input === 'number') n = input
  else if (typeof input === 'string' && input.trim() !== '') n = Number(input.trim())
  else return null
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null
  return n
}

export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function lastTsByItem(records: ItemRecord[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of records) {
    const cur = m.get(r.itemId)
    if (cur === undefined || r.ts > cur) m.set(r.itemId, r.ts)
  }
  return m
}

export function sortItemsForHome(items: Item[], lastTs: Map<string, number>): Item[] {
  return items
    .filter((i) => !i.archived)
    .slice()
    .sort((a, b) => {
      const ta = lastTs.get(a.id)
      const tb = lastTs.get(b.id)
      if (ta === undefined && tb === undefined) return a.created - b.created
      if (ta === undefined) return 1
      if (tb === undefined) return -1
      return tb - ta
    })
}

export function recent7(items: Item[], lastTs: Map<string, number>, now: number): { done: number; total: number } {
  const active = items.filter((i) => !i.archived)
  const cutoff = now - 7 * DAY_MS
  const done = active.filter((i) => (lastTs.get(i.id) ?? -Infinity) > cutoff).length
  return { done, total: active.length }
}

export function averageIntervalDays(tss: number[]): number | null {
  if (tss.length < 3) return null
  const min = Math.min(...tss)
  const max = Math.max(...tss)
  return (max - min) / (tss.length - 1) / DAY_MS
}

export function formatIntervalDays(days: number): string {
  return days < 10 ? days.toFixed(1) : String(Math.round(days))
}

/** For a newest-first timestamp list, gap in calendar days between each adjacent pair. */
export function gapsBetween(tssDesc: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < tssDesc.length - 1; i++) {
    out.push(calendarDaysBetween(tssDesc[i + 1]!, tssDesc[i]!))
  }
  return out
}

export function backupBannerVisible(
  recordCount: number,
  s: { lastBackupAt: number | null; backupSnoozeUntil: number | null },
  now: number,
): boolean {
  if (recordCount < BACKUP_MIN_RECORDS) return false
  if (s.backupSnoozeUntil !== null && now <= s.backupSnoozeUntil) return false
  if (s.lastBackupAt === null) return true
  return now - s.lastBackupAt > BACKUP_STALE_DAYS * DAY_MS
}
```

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/calc.test.ts`
Expected: 全部 passed。若 DST 測試在這台機器失敗（Node 不接受執行期改 TZ），改成 `it.skip` 並在 commit message 註明；不要刪 `Math.round`。

- [ ] **Step 4: Commit**

```bash
git add src/lib/calc.ts tests/calc.test.ts
git commit -m "Add calendar-day and display calculations

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 日期文字 format.ts

**Files:**
- Create: `src/lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function formatTime(ts: number): string            // "14:32"
  export function formatMonthDay(ts: number): string        // "9月20日"
  export function formatShort(ts: number): string           // "9月20日 14:32"
  export function formatLong(ts: number): string            // "2026年9月20日 週日 14:32"
  export function formatBackupFileName(now: number): string // "上次備份-2026-10-05.json"
  export function toDatetimeLocalValue(ts: number): string  // "2026-09-20T14:32" 給 <input type=datetime-local>
  export function fromDatetimeLocalValue(v: string): number | null
  export function toDateKey(ts: number): string             // "2026-09-20" 當地日期鍵
  ```

- [ ] **Step 1: 失敗測試**

`tests/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  formatTime, formatMonthDay, formatShort, formatLong, formatBackupFileName,
  toDatetimeLocalValue, fromDatetimeLocalValue, toDateKey,
} from '../src/lib/format'

const ts = new Date(2026, 8, 20, 14, 32).getTime() // 2026-09-20 is a Sunday

describe('format', () => {
  it('time', () => expect(formatTime(ts)).toBe('14:32'))
  it('month day', () => expect(formatMonthDay(ts)).toBe('9月20日'))
  it('short', () => expect(formatShort(ts)).toBe('9月20日 14:32'))
  it('long with weekday', () => expect(formatLong(ts)).toBe('2026年9月20日 週日 14:32'))
  it('pads single digits in time only', () => {
    expect(formatShort(new Date(2026, 0, 5, 9, 7).getTime())).toBe('1月5日 09:07')
  })
  it('backup file name', () => {
    expect(formatBackupFileName(new Date(2026, 9, 5, 9).getTime())).toBe('上次備份-2026-10-05.json')
  })
  it('datetime-local round trip', () => {
    expect(toDatetimeLocalValue(ts)).toBe('2026-09-20T14:32')
    expect(fromDatetimeLocalValue('2026-09-20T14:32')).toBe(ts)
    expect(fromDatetimeLocalValue('')).toBeNull()
    expect(fromDatetimeLocalValue('garbage')).toBeNull()
  })
  it('date key', () => expect(toDateKey(ts)).toBe('2026-09-20'))
})
```

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL。

- [ ] **Step 2: 實作**

`src/lib/format.ts`:
```ts
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const
const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatMonthDay(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatShort(ts: number): string {
  return `${formatMonthDay(ts)} ${formatTime(ts)}`
}

export function formatLong(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]} ${formatTime(ts)}`
}

export function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatBackupFileName(now: number): string {
  return `上次備份-${toDateKey(now)}.json`
}

export function toDatetimeLocalValue(ts: number): string {
  return `${toDateKey(ts)}T${formatTime(ts)}`
}

export function fromDatetimeLocalValue(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi] = m
  const t = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)).getTime()
  return Number.isFinite(t) ? t : null
}
```

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/format.test.ts`
Expected: 全部 passed。

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts tests/format.test.ts
git commit -m "Add zh-TW date/time formatting helpers

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 設定 settings.ts 與資料庫 db.ts

**Files:**
- Create: `src/lib/settings.ts`, `src/lib/db.ts`
- Test: `tests/settings.test.ts`, `tests/db.test.ts`

**Interfaces:**
- Consumes: `Settings`, `DEFAULT_SETTINGS`, `Item`, `ItemRecord`, `Theme` from `types.ts`
- Produces:
  ```ts
  // settings.ts
  export const SETTINGS_KEY = 'lasttime.settings'
  export interface KeyValueStorage { getItem(k: string): string | null; setItem(k: string, v: string): void }
  export function loadSettings(storage?: KeyValueStorage): Settings          // 壞資料回 DEFAULT_SETTINGS
  export function saveSettings(s: Settings, storage?: KeyValueStorage): void
  // db.ts
  export class LastTimeDB extends Dexie { items: Table<Item, string>; records: Table<ItemRecord, string> }
  export function createDb(name?: string): LastTimeDB
  export async function loadAll(db): Promise<{ items: Item[]; records: ItemRecord[] }>
  export async function putItem(db, item: Item): Promise<void>
  export async function deleteItemCascade(db, itemId: string): Promise<void>
  export async function putRecord(db, r: ItemRecord): Promise<void>
  export async function putRecords(db, rs: ItemRecord[]): Promise<void>
  export async function deleteRecord(db, id: string): Promise<void>
  export async function addMany(db, items: Item[], records: ItemRecord[]): Promise<void>   // bulkPut
  export async function replaceAll(db, items: Item[], records: ItemRecord[]): Promise<void> // 清空後寫入，同一個 transaction
  export async function clearAll(db): Promise<void>
  ```

- [ ] **Step 1: settings 失敗測試**

`tests/settings.test.ts`:
```ts
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
})
```

Run: `npx vitest run tests/settings.test.ts`
Expected: FAIL。

- [ ] **Step 2: settings 實作**

`src/lib/settings.ts`:
```ts
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
```

- [ ] **Step 3: 跑 settings 測試**

Run: `npx vitest run tests/settings.test.ts`
Expected: 3 passed。

- [ ] **Step 4: db 失敗測試**

`tests/db.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDb, loadAll, putItem, deleteItemCascade, putRecord, putRecords, deleteRecord, addMany, replaceAll, clearAll,
  type LastTimeDB,
} from '../src/lib/db'
import type { Item, ItemRecord } from '../src/lib/types'

const item = (id: string): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1 })
const rec = (id: string, itemId: string, ts = 1): ItemRecord => ({ id, itemId, ts, note: '' })

let db: LastTimeDB
let n = 0
beforeEach(() => {
  db = createDb(`test-${n++}`)
})

describe('db', () => {
  it('starts empty', async () => {
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
  it('puts and loads items and records', async () => {
    await putItem(db, item('a'))
    await putRecord(db, rec('r1', 'a'))
    await putRecords(db, [rec('r2', 'a', 2), rec('r3', 'a', 3)])
    const all = await loadAll(db)
    expect(all.items).toHaveLength(1)
    expect(all.records.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3'])
  })
  it('putItem overwrites by id', async () => {
    await putItem(db, item('a'))
    await putItem(db, { ...item('a'), name: 'renamed' })
    expect((await loadAll(db)).items).toEqual([{ ...item('a'), name: 'renamed' }])
  })
  it('deleteItemCascade removes its records only', async () => {
    await addMany(db, [item('a'), item('b')], [rec('r1', 'a'), rec('r2', 'b')])
    await deleteItemCascade(db, 'a')
    const all = await loadAll(db)
    expect(all.items.map((i) => i.id)).toEqual(['b'])
    expect(all.records.map((r) => r.id)).toEqual(['r2'])
  })
  it('deleteRecord', async () => {
    await addMany(db, [item('a')], [rec('r1', 'a'), rec('r2', 'a')])
    await deleteRecord(db, 'r1')
    expect((await loadAll(db)).records.map((r) => r.id)).toEqual(['r2'])
  })
  it('replaceAll wipes then writes', async () => {
    await addMany(db, [item('old')], [rec('r0', 'old')])
    await replaceAll(db, [item('new')], [rec('r9', 'new')])
    const all = await loadAll(db)
    expect(all.items.map((i) => i.id)).toEqual(['new'])
    expect(all.records.map((r) => r.id)).toEqual(['r9'])
  })
  it('clearAll', async () => {
    await addMany(db, [item('a')], [rec('r1', 'a')])
    await clearAll(db)
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
})
```

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL。

- [ ] **Step 5: db 實作**

`src/lib/db.ts`:
```ts
import Dexie, { type Table } from 'dexie'
import type { Item, ItemRecord } from './types'

export class LastTimeDB extends Dexie {
  items!: Table<Item, string>
  records!: Table<ItemRecord, string>

  constructor(name = 'lasttime') {
    super(name)
    this.version(1).stores({
      items: 'id',
      records: 'id, itemId, ts',
    })
  }
}

export function createDb(name?: string): LastTimeDB {
  return new LastTimeDB(name)
}

export async function loadAll(db: LastTimeDB): Promise<{ items: Item[]; records: ItemRecord[] }> {
  const [items, records] = await Promise.all([db.items.toArray(), db.records.toArray()])
  return { items, records }
}

export async function putItem(db: LastTimeDB, item: Item): Promise<void> {
  await db.items.put(item)
}

export async function deleteItemCascade(db: LastTimeDB, itemId: string): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.records.where('itemId').equals(itemId).delete()
    await db.items.delete(itemId)
  })
}

export async function putRecord(db: LastTimeDB, r: ItemRecord): Promise<void> {
  await db.records.put(r)
}

export async function putRecords(db: LastTimeDB, rs: ItemRecord[]): Promise<void> {
  await db.records.bulkPut(rs)
}

export async function deleteRecord(db: LastTimeDB, id: string): Promise<void> {
  await db.records.delete(id)
}

export async function addMany(db: LastTimeDB, items: Item[], records: ItemRecord[]): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.bulkPut(items)
    await db.records.bulkPut(records)
  })
}

export async function replaceAll(db: LastTimeDB, items: Item[], records: ItemRecord[]): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.clear()
    await db.records.clear()
    await db.items.bulkPut(items)
    await db.records.bulkPut(records)
  })
}

export async function clearAll(db: LastTimeDB): Promise<void> {
  await db.transaction('rw', db.items, db.records, async () => {
    await db.items.clear()
    await db.records.clear()
  })
}
```

- [ ] **Step 6: 跑 db 測試**

Run: `npx vitest run tests/db.test.ts`
Expected: 7 passed。

- [ ] **Step 7: Commit**

```bash
git add src/lib/settings.ts src/lib/db.ts tests/settings.test.ts tests/db.test.ts
git commit -m "Add settings persistence and Dexie data layer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 備份 backup.ts

**Files:**
- Create: `src/lib/backup.ts`
- Test: `tests/backup.test.ts`

**Interfaces:**
- Consumes: `Item`, `ItemRecord`, `Settings`, `Theme`; `normalizeExpectDays` from `calc.ts`; `DEFAULT_EMOJI` from `emoji.ts`
- Produces:
  ```ts
  export const BACKUP_APP = 'lasttime'
  export const BACKUP_VERSION = 1
  export interface ParsedBackup {
    exportedAt: string | null
    items: Item[]
    records: ItemRecord[]            // 只保留 itemId 在檔案 items 內的；合併時另外允許現有項目
    orphanRecords: ItemRecord[]      // itemId 不在檔案 items 內，合併時若現有資料有該項目才加入
    settings: { theme?: Theme; vibrate?: boolean }
  }
  export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; reason: 'invalid-json' | 'not-lasttime' }
  export function serializeBackup(items: Item[], records: ItemRecord[], settings: Settings, now: number): string
  export function parseBackup(text: string): ParseResult
  export function summarize(b: ParsedBackup): { exportedAt: string | null; itemCount: number; recordCount: number }
  export function planMerge(existing: { items: Item[]; records: ItemRecord[] }, b: ParsedBackup): { items: Item[]; records: ItemRecord[] }
  export function planReplace(b: ParsedBackup): { items: Item[]; records: ItemRecord[] }
  ```

- [ ] **Step 1: 失敗測試**

`tests/backup.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup, summarize, planMerge, planReplace } from '../src/lib/backup'
import type { Item, ItemRecord, Settings } from '../src/lib/types'

const item = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1, ...over })
const rec = (id: string, itemId: string, ts = 1): ItemRecord => ({ id, itemId, ts, note: '' })
const settings: Settings = { theme: 'dark', vibrate: false, lastBackupAt: 5, backupSnoozeUntil: 6 }

describe('serializeBackup', () => {
  it('writes the documented shape and only theme/vibrate from settings', () => {
    const text = serializeBackup([item('a', { expectDays: 14 })], [rec('r1', 'a', 1791139620000)], settings, Date.UTC(2026, 9, 5, 9, 30))
    const j = JSON.parse(text)
    expect(j).toEqual({
      app: 'lasttime',
      version: 1,
      exportedAt: '2026-10-05T09:30:00.000Z',
      items: [{ id: 'a', name: 'a', emoji: '📌', expectDays: 14, archived: false, created: 1 }],
      records: [{ id: 'r1', itemId: 'a', ts: 1791139620000, note: '' }],
      settings: { theme: 'dark', vibrate: false },
    })
    expect(Object.keys(j)).not.toContain('cats')
  })
  it('round-trips through parseBackup', () => {
    const text = serializeBackup([item('a')], [rec('r1', 'a')], settings, 0)
    const res = parseBackup(text)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.backup.items).toEqual([item('a')])
      expect(res.backup.records).toEqual([rec('r1', 'a')])
      expect(res.backup.settings).toEqual({ theme: 'dark', vibrate: false })
    }
  })
})

describe('parseBackup rejects', () => {
  it('non-JSON', () => {
    expect(parseBackup('hello')).toEqual({ ok: false, reason: 'invalid-json' })
    expect(parseBackup('')).toEqual({ ok: false, reason: 'invalid-json' })
  })
  it('JSON that is not a lasttime backup', () => {
    expect(parseBackup('{"app":"other","items":[]}')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('{"app":"lasttime","items":"nope"}')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('[]')).toEqual({ ok: false, reason: 'not-lasttime' })
    expect(parseBackup('null')).toEqual({ ok: false, reason: 'not-lasttime' })
  })
})

describe('parseBackup tolerance', () => {
  it('fills defaults, normalizes expectDays, skips bad rows, ignores unknown keys', () => {
    const res = parseBackup(JSON.stringify({
      app: 'lasttime', version: 1, exportedAt: 'x', cats: [{ id: 'c' }],
      items: [
        { id: 'a', name: '吃藥', created: 10, catId: 'c', expectDays: 0, hasPhoto: true },
        { id: '', name: 'bad', created: 1 },
        { id: 'b', name: 'nocreated' },
        { id: 'c', name: 7, created: 1 },
        'junk',
      ],
      records: [
        { id: 'r1', itemId: 'a', ts: 5, note: 'ok', hasPhoto: false },
        { id: 'r2', itemId: 'a', ts: 'five' },
        { id: 'r3', itemId: 'zzz', ts: 6 },
        { id: 'r4', itemId: 'a', ts: 7, note: 42 },
      ],
      settings: { theme: 'light', vibrate: 'yes', other: 1 },
      photos: {},
    }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.backup.items).toEqual([{ id: 'a', name: '吃藥', emoji: '📌', expectDays: null, archived: false, created: 10 }])
    expect(res.backup.records).toEqual([
      { id: 'r1', itemId: 'a', ts: 5, note: 'ok' },
      { id: 'r4', itemId: 'a', ts: 7, note: '' },
    ])
    expect(res.backup.orphanRecords).toEqual([{ id: 'r3', itemId: 'zzz', ts: 6, note: '' }])
    expect(res.backup.settings).toEqual({ theme: 'light' })
    expect(res.backup.exportedAt).toBe('x')
  })
  it('missing records/settings are fine', () => {
    const res = parseBackup('{"app":"lasttime","items":[]}')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.backup.records).toEqual([])
      expect(res.backup.settings).toEqual({})
      expect(res.backup.exportedAt).toBeNull()
    }
  })
})

describe('summarize', () => {
  it('counts', () => {
    const res = parseBackup(serializeBackup([item('a'), item('b')], [rec('r1', 'a')], settings, 0))
    if (!res.ok) throw new Error()
    expect(summarize(res.backup)).toEqual({ exportedAt: '1970-01-01T00:00:00.000Z', itemCount: 2, recordCount: 1 })
  })
})

describe('planMerge / planReplace', () => {
  const existing = { items: [item('a', { name: 'mine' })], records: [rec('r1', 'a')] }
  const parsed = (() => {
    const res = parseBackup(JSON.stringify({
      app: 'lasttime',
      items: [{ id: 'a', name: 'theirs', created: 1 }, { id: 'b', name: 'b', created: 1 }],
      records: [{ id: 'r1', itemId: 'a', ts: 1 }, { id: 'r2', itemId: 'b', ts: 2 }, { id: 'r3', itemId: 'a', ts: 3 }, { id: 'r4', itemId: 'ghost', ts: 4 }],
    }))
    if (!res.ok) throw new Error()
    return res.backup
  })()
  it('merge skips existing ids and keeps existing versions', () => {
    const plan = planMerge(existing, parsed)
    expect(plan.items.map((i) => i.id)).toEqual(['b'])
    expect(plan.records.map((r) => r.id)).toEqual(['r2', 'r3'])
  })
  it('merge accepts orphan records whose item exists locally', () => {
    const plan = planMerge({ items: [item('ghost')], records: [] }, parsed)
    expect(plan.records.map((r) => r.id)).toContain('r4')
  })
  it('merging the same file twice adds nothing new', () => {
    const first = planMerge(existing, parsed)
    const after = { items: [...existing.items, ...first.items], records: [...existing.records, ...first.records] }
    expect(planMerge(after, parsed)).toEqual({ items: [], records: [] })
  })
  it('replace uses file contents only, dropping orphans', () => {
    const plan = planReplace(parsed)
    expect(plan.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(plan.records.map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })
})
```

Run: `npx vitest run tests/backup.test.ts`
Expected: FAIL。

- [ ] **Step 2: 實作**

`src/lib/backup.ts`:
```ts
import type { Item, ItemRecord, Settings, Theme } from './types'
import { normalizeExpectDays } from './calc'
import { DEFAULT_EMOJI } from './emoji'

export const BACKUP_APP = 'lasttime'
export const BACKUP_VERSION = 1

export interface ParsedBackup {
  exportedAt: string | null
  items: Item[]
  records: ItemRecord[]
  orphanRecords: ItemRecord[]
  settings: { theme?: Theme; vibrate?: boolean }
}

export type ParseResult =
  | { ok: true; backup: ParsedBackup }
  | { ok: false; reason: 'invalid-json' | 'not-lasttime' }

export function serializeBackup(items: Item[], records: ItemRecord[], settings: Settings, now: number): string {
  const payload = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    items: items.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji, expectDays: i.expectDays, archived: i.archived, created: i.created })),
    records: records.map((r) => ({ id: r.id, itemId: r.itemId, ts: r.ts, note: r.note })),
    settings: { theme: settings.theme, vibrate: settings.vibrate },
  }
  return JSON.stringify(payload, null, 2)
}

const THEMES: readonly Theme[] = ['system', 'light', 'dark']
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function toItem(raw: unknown): Item | null {
  if (!isObj(raw)) return null
  if (!nonEmptyString(raw['id']) || typeof raw['name'] !== 'string' || !finite(raw['created'])) return null
  return {
    id: raw['id'],
    name: raw['name'],
    emoji: nonEmptyString(raw['emoji']) ? raw['emoji'] : DEFAULT_EMOJI,
    expectDays: normalizeExpectDays(raw['expectDays']),
    archived: raw['archived'] === true,
    created: raw['created'],
  }
}

function toRecord(raw: unknown): ItemRecord | null {
  if (!isObj(raw)) return null
  if (!nonEmptyString(raw['id']) || !nonEmptyString(raw['itemId']) || !finite(raw['ts'])) return null
  return { id: raw['id'], itemId: raw['itemId'], ts: raw['ts'], note: typeof raw['note'] === 'string' ? raw['note'] : '' }
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }
  if (!isObj(raw) || raw['app'] !== BACKUP_APP || !Array.isArray(raw['items'])) {
    return { ok: false, reason: 'not-lasttime' }
  }
  const items = raw['items'].map(toItem).filter((i): i is Item => i !== null)
  const itemIds = new Set(items.map((i) => i.id))
  const allRecords = (Array.isArray(raw['records']) ? raw['records'] : []).map(toRecord).filter((r): r is ItemRecord => r !== null)
  const records = allRecords.filter((r) => itemIds.has(r.itemId))
  const orphanRecords = allRecords.filter((r) => !itemIds.has(r.itemId))

  const settings: ParsedBackup['settings'] = {}
  if (isObj(raw['settings'])) {
    const s = raw['settings']
    if (THEMES.includes(s['theme'] as Theme)) settings.theme = s['theme'] as Theme
    if (typeof s['vibrate'] === 'boolean') settings.vibrate = s['vibrate']
  }

  return {
    ok: true,
    backup: {
      exportedAt: typeof raw['exportedAt'] === 'string' ? raw['exportedAt'] : null,
      items,
      records,
      orphanRecords,
      settings,
    },
  }
}

export function summarize(b: ParsedBackup): { exportedAt: string | null; itemCount: number; recordCount: number } {
  return { exportedAt: b.exportedAt, itemCount: b.items.length, recordCount: b.records.length }
}

export function planMerge(
  existing: { items: Item[]; records: ItemRecord[] },
  b: ParsedBackup,
): { items: Item[]; records: ItemRecord[] } {
  const haveItem = new Set(existing.items.map((i) => i.id))
  const haveRec = new Set(existing.records.map((r) => r.id))
  const items = b.items.filter((i) => !haveItem.has(i.id))
  const knownItems = new Set([...haveItem, ...items.map((i) => i.id)])
  const records = [...b.records, ...b.orphanRecords].filter((r) => !haveRec.has(r.id) && knownItems.has(r.itemId))
  return { items, records }
}

export function planReplace(b: ParsedBackup): { items: Item[]; records: ItemRecord[] } {
  return { items: b.items, records: b.records }
}
```

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/backup.test.ts`
Expected: 全部 passed。

- [ ] **Step 4: Commit**

```bash
git add src/lib/backup.ts tests/backup.test.ts
git commit -m "Add backup serialization, parsing and merge planning

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 記憶體 Store（store.svelte.ts）

**Files:**
- Create: `src/lib/store.svelte.ts`, `src/lib/app-store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: 全部 `db.ts` 函式、`loadSettings`/`saveSettings`、`newId`、`guessEmoji`、`normalizeName`、`normalizeExpectDays`、`lastTsByItem`
- Produces:
  ```ts
  export class FutureTimeError extends Error {}
  export class EmptyNameError extends Error {}
  export class NotFoundError extends Error {}
  export interface LogResult { record: ItemRecord; item: Item; itemCreated: boolean }
  export class Store {
    items: Item[]; records: ItemRecord[]; settings: Settings; ready: boolean; now: number   // 皆為 $state.raw
    readonly lastTs: Map<string, number>                                                  // $derived
    constructor(db: LastTimeDB, storage?: KeyValueStorage, clock?: () => number)
    init(): Promise<void>
    tick(): void
    itemById(id: string): Item | undefined
    recordById(id: string): ItemRecord | undefined
    recordsOf(itemId: string): ItemRecord[]           // 新到舊
    findByName(raw: string): Item | undefined          // normalizeName 後完全相同
    addItemAndLog(rawName: string, ts?: number): Promise<LogResult>
    logNow(itemId: string, ts?: number): Promise<LogResult>
    addRecord(itemId: string, ts: number, note?: string): Promise<ItemRecord>
    addRecords(itemId: string, tss: number[], note?: string): Promise<ItemRecord[]>
    updateRecord(id: string, patch: { ts?: number; note?: string }): Promise<void>
    deleteRecord(id: string): Promise<void>
    updateItem(id: string, patch: { name?: string; emoji?: string; expectDays?: unknown; archived?: boolean }): Promise<void>
    deleteItem(id: string): Promise<void>
    undoLog(result: LogResult): Promise<void>
    mergeIn(items: Item[], records: ItemRecord[]): Promise<void>
    replaceWith(items: Item[], records: ItemRecord[]): Promise<void>
    clearAllData(): Promise<void>
    updateSettings(patch: Partial<Settings>): void
  }
  // app-store.ts
  export const store: Store   // new Store(createDb())，瀏覽器用的單例
  ```
- 設計要點：狀態全部用 `$state.raw` 並以不可變方式替換陣列（`this.items = [...]`），存進 Dexie 的永遠是普通物件，不會碰到 Proxy 的 DataCloneError。先改記憶體再寫 DB；DB 寫入失敗就從 DB 重新載入並把錯誤丟出去。
- 未來時間判定：`ts > clock() + 60_000` 視為未來（留 1 分鐘給時鐘誤差）。

- [ ] **Step 1: 失敗測試**

`tests/store.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { Store, FutureTimeError, EmptyNameError, NotFoundError } from '../src/lib/store.svelte'
import { createDb, loadAll, type LastTimeDB } from '../src/lib/db'
import type { KeyValueStorage } from '../src/lib/settings'

const T0 = new Date(2026, 9, 5, 9, 0).getTime()
const HOUR = 3_600_000
const DAY = 86_400_000

function memStorage(): KeyValueStorage {
  const map = new Map<string, string>()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

let db: LastTimeDB
let store: Store
let now = T0
let n = 0
beforeEach(async () => {
  now = T0
  db = createDb(`store-${n++}`)
  store = new Store(db, memStorage(), () => now)
  await store.init()
})

describe('init', () => {
  it('loads persisted data and marks ready', async () => {
    const r = await store.addItemAndLog('吃藥')
    const again = new Store(db, memStorage(), () => now)
    await again.init()
    expect(again.ready).toBe(true)
    expect(again.items.map((i) => i.id)).toEqual([r.item.id])
    expect(again.records.map((x) => x.id)).toEqual([r.record.id])
  })
})

describe('addItemAndLog', () => {
  it('creates item with guessed emoji and a record at now', async () => {
    const r = await store.addItemAndLog('  換瓦斯 ')
    expect(r.itemCreated).toBe(true)
    expect(r.item).toMatchObject({ name: '換瓦斯', emoji: '🔥', expectDays: null, archived: false, created: T0 })
    expect(r.record).toMatchObject({ itemId: r.item.id, ts: T0, note: '' })
    expect(store.lastTs.get(r.item.id)).toBe(T0)
    expect((await loadAll(db)).items).toHaveLength(1)
  })
  it('rejects blank names', async () => {
    await expect(store.addItemAndLog('   ')).rejects.toBeInstanceOf(EmptyNameError)
    expect(store.items).toHaveLength(0)
  })
  it('logs onto an existing item when the normalized name matches', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += HOUR
    const b = await store.addItemAndLog(' 吃藥')
    expect(b.itemCreated).toBe(false)
    expect(b.item.id).toBe(a.item.id)
    expect(store.items).toHaveLength(1)
    expect(store.recordsOf(a.item.id).map((r) => r.ts)).toEqual([T0 + HOUR, T0])
  })
  it('findByName ignores archived? no — archived items still match so they are not duplicated', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { archived: true })
    expect(store.findByName('吃藥')?.id).toBe(a.item.id)
  })
})

describe('logNow / undoLog', () => {
  it('logNow adds a record and returns itemCreated=false', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += 2 * HOUR
    const r = await store.logNow(a.item.id)
    expect(r.itemCreated).toBe(false)
    expect(store.records).toHaveLength(2)
    expect(store.lastTs.get(a.item.id)).toBe(T0 + 2 * HOUR)
  })
  it('logNow on unknown item throws NotFoundError', async () => {
    await expect(store.logNow('nope')).rejects.toBeInstanceOf(NotFoundError)
  })
  it('undo of a fresh item removes record and item', async () => {
    const r = await store.addItemAndLog('吃藥')
    await store.undoLog(r)
    expect(store.items).toEqual([])
    expect(store.records).toEqual([])
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
  it('undo of a log on an existing item keeps the item', async () => {
    const a = await store.addItemAndLog('吃藥')
    now += HOUR
    const r = await store.logNow(a.item.id)
    await store.undoLog(r)
    expect(store.items).toHaveLength(1)
    expect(store.records.map((x) => x.id)).toEqual([a.record.id])
  })
  it('undo is a no-op when the record (or item) is already gone', async () => {
    const r = await store.addItemAndLog('吃藥')
    await store.deleteItem(r.item.id)
    await expect(store.undoLog(r)).resolves.toBeUndefined()
    expect(store.items).toEqual([])
  })
})

describe('records', () => {
  it('addRecord rejects future timestamps beyond 1 minute', async () => {
    const a = await store.addItemAndLog('吃藥')
    await expect(store.addRecord(a.item.id, now + 2 * HOUR)).rejects.toBeInstanceOf(FutureTimeError)
    await expect(store.addRecord(a.item.id, now + 30_000)).resolves.toBeTruthy()
    expect(store.records).toHaveLength(2)
  })
  it('addRecords adds one per timestamp with shared note', async () => {
    const a = await store.addItemAndLog('吃藥')
    const rs = await store.addRecords(a.item.id, [T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY], 'x')
    expect(rs).toHaveLength(3)
    expect(store.recordsOf(a.item.id).map((r) => r.ts)).toEqual([T0, T0 - DAY, T0 - 2 * DAY, T0 - 3 * DAY])
    expect(rs.every((r) => r.note === 'x')).toBe(true)
  })
  it('updateRecord changes ts/note and rejects future ts', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateRecord(a.record.id, { ts: T0 - HOUR, note: '早上' })
    expect(store.recordById(a.record.id)).toMatchObject({ ts: T0 - HOUR, note: '早上' })
    await expect(store.updateRecord(a.record.id, { ts: now + DAY })).rejects.toBeInstanceOf(FutureTimeError)
    expect(store.recordById(a.record.id)?.ts).toBe(T0 - HOUR)
    expect((await loadAll(db)).records[0]?.ts).toBe(T0 - HOUR)
  })
  it('deleteRecord', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.deleteRecord(a.record.id)
    expect(store.records).toEqual([])
    expect(store.items).toHaveLength(1)
  })
})

describe('items', () => {
  it('updateItem normalizes name and expectDays', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.updateItem(a.item.id, { name: ' 早上吃藥 ', emoji: '🌅', expectDays: '1' })
    expect(store.itemById(a.item.id)).toMatchObject({ name: '早上吃藥', emoji: '🌅', expectDays: 1 })
    await store.updateItem(a.item.id, { expectDays: '0' })
    expect(store.itemById(a.item.id)?.expectDays).toBeNull()
    await expect(store.updateItem(a.item.id, { name: ' ' })).rejects.toBeInstanceOf(EmptyNameError)
  })
  it('deleteItem cascades to records', async () => {
    const a = await store.addItemAndLog('吃藥')
    await store.addRecords(a.item.id, [T0 - DAY])
    await store.deleteItem(a.item.id)
    expect(store.items).toEqual([])
    expect(store.records).toEqual([])
    expect(await loadAll(db)).toEqual({ items: [], records: [] })
  })
})

describe('bulk', () => {
  const item = (id: string) => ({ id, name: id, emoji: '📌', expectDays: null, archived: false, created: 1 })
  const rec = (id: string, itemId: string) => ({ id, itemId, ts: 1, note: '' })
  it('mergeIn appends', async () => {
    await store.addItemAndLog('吃藥')
    await store.mergeIn([item('x')], [rec('rx', 'x')])
    expect(store.items).toHaveLength(2)
    expect(store.records).toHaveLength(2)
  })
  it('replaceWith wipes first', async () => {
    await store.addItemAndLog('吃藥')
    await store.replaceWith([item('x')], [rec('rx', 'x')])
    expect(store.items.map((i) => i.id)).toEqual(['x'])
    expect(store.records.map((r) => r.id)).toEqual(['rx'])
  })
  it('clearAllData empties both and resets backup settings but keeps theme/vibrate', async () => {
    await store.addItemAndLog('吃藥')
    store.updateSettings({ theme: 'dark', vibrate: false, lastBackupAt: 5, backupSnoozeUntil: 6 })
    await store.clearAllData()
    expect(store.items).toEqual([])
    expect(store.settings).toEqual({ theme: 'dark', vibrate: false, lastBackupAt: null, backupSnoozeUntil: null })
  })
})

describe('settings and clock', () => {
  it('updateSettings persists to storage', async () => {
    const storage = memStorage()
    const s = new Store(createDb(`store-settings-${n++}`), storage, () => now)
    await s.init()
    s.updateSettings({ theme: 'light' })
    const s2 = new Store(createDb(`store-settings-${n++}`), storage, () => now)
    await s2.init()
    expect(s2.settings.theme).toBe('light')
  })
  it('tick updates now', () => {
    now = T0 + 5
    store.tick()
    expect(store.now).toBe(T0 + 5)
  })
})
```

Run: `npx vitest run tests/store.test.ts`
Expected: FAIL。

- [ ] **Step 2: 實作 store.svelte.ts**

```ts
import {
  loadAll, putItem, deleteItemCascade, putRecord, putRecords, deleteRecord as dbDeleteRecord,
  addMany, replaceAll, clearAll, type LastTimeDB,
} from './db'
import { loadSettings, saveSettings, type KeyValueStorage } from './settings'
import { newId } from './ids'
import { guessEmoji } from './emoji'
import { normalizeName, normalizeExpectDays, lastTsByItem } from './calc'
import { DEFAULT_SETTINGS, type Item, type ItemRecord, type Settings } from './types'

export class FutureTimeError extends Error {
  constructor() { super('time is in the future') }
}
export class EmptyNameError extends Error {
  constructor() { super('name is empty') }
}
export class NotFoundError extends Error {
  constructor(what: string) { super(`${what} not found`) }
}

export interface LogResult {
  record: ItemRecord
  item: Item
  itemCreated: boolean
}

const FUTURE_SLACK_MS = 60_000

export class Store {
  items = $state.raw<Item[]>([])
  records = $state.raw<ItemRecord[]>([])
  settings = $state.raw<Settings>({ ...DEFAULT_SETTINGS })
  ready = $state(false)
  now = $state(0)

  readonly lastTs = $derived(lastTsByItem(this.records))

  constructor(
    private readonly db: LastTimeDB,
    private readonly storage?: KeyValueStorage,
    private readonly clock: () => number = Date.now,
  ) {
    this.now = clock()
  }

  async init(): Promise<void> {
    this.settings = loadSettings(this.storage)
    await this.reload()
    this.ready = true
  }

  private async reload(): Promise<void> {
    const all = await loadAll(this.db)
    this.items = all.items
    this.records = all.records
  }

  tick(): void {
    this.now = this.clock()
  }

  // ---- queries ----

  itemById(id: string): Item | undefined {
    return this.items.find((i) => i.id === id)
  }

  recordById(id: string): ItemRecord | undefined {
    return this.records.find((r) => r.id === id)
  }

  recordsOf(itemId: string): ItemRecord[] {
    return this.records.filter((r) => r.itemId === itemId).sort((a, b) => b.ts - a.ts)
  }

  findByName(raw: string): Item | undefined {
    const name = normalizeName(raw)
    if (!name) return undefined
    return this.items.find((i) => i.name === name)
  }

  // ---- mutations ----

  /** Apply an in-memory change, then persist; on failure reload from DB and rethrow. */
  private async commit(mutate: () => void, persist: () => Promise<void>): Promise<void> {
    mutate()
    try {
      await persist()
    } catch (e) {
      await this.reload()
      throw e
    }
  }

  private assertNotFuture(ts: number): void {
    if (ts > this.clock() + FUTURE_SLACK_MS) throw new FutureTimeError()
  }

  async addItemAndLog(rawName: string, ts: number = this.clock()): Promise<LogResult> {
    const name = normalizeName(rawName)
    if (!name) throw new EmptyNameError()
    const existing = this.findByName(name)
    if (existing) return this.logNow(existing.id, ts)

    const item: Item = { id: newId(ts), name, emoji: guessEmoji(name), expectDays: null, archived: false, created: ts }
    const record: ItemRecord = { id: newId(ts), itemId: item.id, ts, note: '' }
    await this.commit(
      () => {
        this.items = [...this.items, item]
        this.records = [...this.records, record]
      },
      () => addMany(this.db, [item], [record]),
    )
    return { record, item, itemCreated: true }
  }

  async logNow(itemId: string, ts: number = this.clock()): Promise<LogResult> {
    const item = this.itemById(itemId)
    if (!item) throw new NotFoundError('item')
    const record = await this.addRecord(itemId, ts)
    return { record, item, itemCreated: false }
  }

  async addRecord(itemId: string, ts: number, note = ''): Promise<ItemRecord> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    this.assertNotFuture(ts)
    const record: ItemRecord = { id: newId(this.clock()), itemId, ts, note }
    await this.commit(
      () => { this.records = [...this.records, record] },
      () => putRecord(this.db, record),
    )
    return record
  }

  async addRecords(itemId: string, tss: number[], note = ''): Promise<ItemRecord[]> {
    if (!this.itemById(itemId)) throw new NotFoundError('item')
    tss.forEach((ts) => this.assertNotFuture(ts))
    const base = this.clock()
    const rs: ItemRecord[] = tss.map((ts, i) => ({ id: newId(base + i), itemId, ts, note }))
    await this.commit(
      () => { this.records = [...this.records, ...rs] },
      () => putRecords(this.db, rs),
    )
    return rs
  }

  async updateRecord(id: string, patch: { ts?: number; note?: string }): Promise<void> {
    const cur = this.recordById(id)
    if (!cur) throw new NotFoundError('record')
    if (patch.ts !== undefined) this.assertNotFuture(patch.ts)
    const next: ItemRecord = { ...cur, ...(patch.ts !== undefined ? { ts: patch.ts } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) }
    await this.commit(
      () => { this.records = this.records.map((r) => (r.id === id ? next : r)) },
      () => putRecord(this.db, next),
    )
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.recordById(id)) return
    await this.commit(
      () => { this.records = this.records.filter((r) => r.id !== id) },
      () => dbDeleteRecord(this.db, id),
    )
  }

  async updateItem(id: string, patch: { name?: string; emoji?: string; expectDays?: unknown; archived?: boolean }): Promise<void> {
    const cur = this.itemById(id)
    if (!cur) throw new NotFoundError('item')
    const next: Item = { ...cur }
    if (patch.name !== undefined) {
      const name = normalizeName(patch.name)
      if (!name) throw new EmptyNameError()
      next.name = name
    }
    if (patch.emoji !== undefined && patch.emoji.trim()) next.emoji = patch.emoji.trim()
    if ('expectDays' in patch) next.expectDays = normalizeExpectDays(patch.expectDays)
    if (patch.archived !== undefined) next.archived = patch.archived
    await this.commit(
      () => { this.items = this.items.map((i) => (i.id === id ? next : i)) },
      () => putItem(this.db, next),
    )
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.itemById(id)) return
    await this.commit(
      () => {
        this.items = this.items.filter((i) => i.id !== id)
        this.records = this.records.filter((r) => r.itemId !== id)
      },
      () => deleteItemCascade(this.db, id),
    )
  }

  async undoLog(result: LogResult): Promise<void> {
    if (this.recordById(result.record.id)) await this.deleteRecord(result.record.id)
    if (result.itemCreated && this.itemById(result.item.id) && this.recordsOf(result.item.id).length === 0) {
      await this.deleteItem(result.item.id)
    }
  }

  async mergeIn(items: Item[], records: ItemRecord[]): Promise<void> {
    await this.commit(
      () => {
        this.items = [...this.items, ...items]
        this.records = [...this.records, ...records]
      },
      () => addMany(this.db, items, records),
    )
  }

  async replaceWith(items: Item[], records: ItemRecord[]): Promise<void> {
    await this.commit(
      () => {
        this.items = items
        this.records = records
      },
      () => replaceAll(this.db, items, records),
    )
  }

  async clearAllData(): Promise<void> {
    await this.commit(
      () => {
        this.items = []
        this.records = []
      },
      () => clearAll(this.db),
    )
    this.updateSettings({ lastBackupAt: null, backupSnoozeUntil: null })
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    saveSettings(this.settings, this.storage)
  }
}
```

`src/lib/app-store.ts`:
```ts
import { createDb } from './db'
import { Store } from './store.svelte'

export const store = new Store(createDb())
```

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/store.test.ts`
Expected: 全部 passed。若出現 `$state is not defined`，確認 `vite.config.ts` 有 `svelte()` plugin 且 `resolve.conditions` 含 `browser`。

- [ ] **Step 4: 全部測試與型別檢查**

Run: `npm test && npm run check`
Expected: 全綠、0 errors。

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.svelte.ts src/lib/app-store.ts tests/store.test.ts
git commit -m "Add reactive store with optimistic persistence

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: App 骨架：路由、抽屜、提示、震動、長按、草稿、字型

**Files:**
- Create: `src/lib/router.svelte.ts`, `src/lib/sheet.svelte.ts`, `src/lib/toast.svelte.ts`, `src/lib/haptics.ts`, `src/lib/longpress.ts`, `src/lib/draft.ts`, `src/components/Sheet.svelte`, `src/components/Toast.svelte`, `src/assets/fonts/Fraunces-latin.woff2`, `src/assets/fonts/OFL.txt`
- Modify: `src/App.svelte`, `src/app.css`, `src/main.ts`
- Test: `tests/router.test.ts`, `tests/draft.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // router.svelte.ts
  export type Route = { name: 'home' } | { name: 'item'; id: string } | { name: 'settings' }
  export function parseHash(hash: string): Route
  export function routeToHash(r: Route): string           // '#/', '#/item/<id>', '#/settings'
  export const router: { readonly route: Route; start(): void; navigate(r: Route): void; replace(r: Route): void; back(): void }
  // sheet.svelte.ts
  export type SheetState =
    | { kind: 'edit-item'; itemId: string }
    | { kind: 'edit-record'; recordId: string }
    | { kind: 'backdate'; itemId: string }
    | { kind: 'import'; backup: ParsedBackup }
    | null
  export const sheets: { readonly current: SheetState; start(): void; open(s: NonNullable<SheetState>): void; close(): void; closeThen(fn: () => void): void }
  // toast.svelte.ts
  export interface ToastAction { label: string; run: () => void }
  export interface ToastState { id: number; message: string; actions: ToastAction[] }
  export const toasts: { readonly current: ToastState | null; show(message: string, actions?: ToastAction[], durationMs?: number): void; dismiss(): void }
  // haptics.ts
  export function vibrate(ms?: number): void              // 讀 store.settings.vibrate
  // longpress.ts
  export function longpress(opts: { ms?: number; onLongPress: () => void }): Attachment<HTMLElement>
  // draft.ts
  export function saveDraft(key: string, value: unknown, storage?: KeyValueStorage & { removeItem(k: string): void }): void
  export function loadDraft<T>(key: string, storage?): T | null
  export function clearDraft(key: string, storage?): void
  ```
- `Sheet.svelte` props：`title: string`, `children: Snippet`。點背景或按返回鍵關閉。
- `Toast.svelte` 無 props，讀 `toasts.current`。

- [ ] **Step 1: 字型檔**

Run（專案根目錄）:
```bash
mkdir -p src/assets/fonts
curl -sL -o src/assets/fonts/Fraunces-latin.woff2 "https://fonts.gstatic.com/s/fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeA.woff2"
curl -sL -o src/assets/fonts/OFL.txt "https://raw.githubusercontent.com/undercasetype/Fraunces/master/OFL.txt"
ls -l src/assets/fonts
```
Expected: woff2 約 67 KB；OFL.txt 開頭是 `Copyright 2020 The Fraunces Project Authors`。這是 Fraunces 可變字型的 latin 子集（含數字），wght 100–900。

- [ ] **Step 2: router 與 draft 失敗測試**

`tests/router.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseHash, routeToHash } from '../src/lib/router.svelte'

describe('router', () => {
  it.each([
    ['', { name: 'home' }],
    ['#', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/item/abc123', { name: 'item', id: 'abc123' }],
    ['#/item/', { name: 'home' }],
    ['#/settings', { name: 'settings' }],
    ['#/whatever', { name: 'home' }],
  ])('parseHash(%j)', (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
  })
  it('routeToHash inverts parseHash', () => {
    expect(routeToHash({ name: 'home' })).toBe('#/')
    expect(routeToHash({ name: 'item', id: 'x' })).toBe('#/item/x')
    expect(routeToHash({ name: 'settings' })).toBe('#/settings')
  })
})
```

`tests/draft.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { saveDraft, loadDraft, clearDraft } from '../src/lib/draft'

function mem() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('draft', () => {
  it('round trips and clears', () => {
    const s = mem()
    saveDraft('k', { a: 1 }, s)
    expect(loadDraft<{ a: number }>('k', s)).toEqual({ a: 1 })
    clearDraft('k', s)
    expect(loadDraft('k', s)).toBeNull()
  })
  it('returns null for garbage', () => {
    const s = mem()
    s.setItem('lasttime.draft.k', '{bad')
    expect(loadDraft('k', s)).toBeNull()
  })
})
```

Run: `npx vitest run tests/router.test.ts tests/draft.test.ts`
Expected: FAIL。

- [ ] **Step 3: router.svelte.ts**

```ts
export type Route = { name: 'home' } | { name: 'item'; id: string } | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const item = /^\/item\/([^/]+)$/.exec(path)
  if (item) return { name: 'item', id: decodeURIComponent(item[1]!) }
  if (path === '/settings') return { name: 'settings' }
  return { name: 'home' }
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'item': return `#/item/${encodeURIComponent(r.id)}`
    case 'settings': return '#/settings'
  }
}

class Router {
  route = $state.raw<Route>({ name: 'home' })

  start(): void {
    this.route = parseHash(location.hash)
    window.addEventListener('hashchange', () => { this.route = parseHash(location.hash) })
  }

  navigate(r: Route): void {
    location.hash = routeToHash(r)
  }

  replace(r: Route): void {
    history.replaceState(history.state, '', routeToHash(r))
    this.route = r
  }

  back(): void {
    history.back()
  }
}

export const router = new Router()
```

- [ ] **Step 4: sheet.svelte.ts**

```ts
import type { ParsedBackup } from './backup'

export type SheetState =
  | { kind: 'edit-item'; itemId: string }
  | { kind: 'edit-record'; recordId: string }
  | { kind: 'backdate'; itemId: string }
  | { kind: 'import'; backup: ParsedBackup }
  | null

const MARK = 'lasttime-sheet'

class Sheets {
  current = $state.raw<SheetState>(null)

  start(): void {
    // Back key / history.back() closes an open sheet.
    window.addEventListener('popstate', () => {
      if (this.current) this.current = null
    })
  }

  open(s: NonNullable<SheetState>): void {
    if (this.current) {
      this.current = s // swap in place, keep the single history entry
      return
    }
    this.current = s
    history.pushState({ [MARK]: true }, '')
  }

  close(): void {
    if (!this.current) return
    this.current = null
    if (history.state && history.state[MARK]) history.back()
  }

  /** Close the sheet, then run `fn` once the history entry has been popped. */
  closeThen(fn: () => void): void {
    if (!this.current) { fn(); return }
    this.current = null
    if (history.state && history.state[MARK]) {
      window.addEventListener('popstate', () => fn(), { once: true })
      history.back()
    } else {
      fn()
    }
  }
}

export const sheets = new Sheets()
```

- [ ] **Step 5: toast.svelte.ts**

```ts
export interface ToastAction { label: string; run: () => void }
export interface ToastState { id: number; message: string; actions: ToastAction[] }

class Toasts {
  current = $state.raw<ToastState | null>(null)
  private timer: ReturnType<typeof setTimeout> | null = null
  private seq = 0

  show(message: string, actions: ToastAction[] = [], durationMs: number = actions.length ? 8000 : 3000): void {
    if (this.timer) clearTimeout(this.timer)
    this.current = { id: ++this.seq, message, actions }
    this.timer = setTimeout(() => this.dismiss(), durationMs)
  }

  dismiss(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.current = null
  }
}

export const toasts = new Toasts()
```

- [ ] **Step 6: haptics.ts、longpress.ts、draft.ts**

`src/lib/haptics.ts`:
```ts
import { store } from './app-store'

export function vibrate(ms = 30): void {
  if (!store.settings.vibrate) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms)
}
```

`src/lib/longpress.ts`:
```ts
import type { Attachment } from 'svelte/attachments'

const MOVE_TOLERANCE_PX = 10

/** Fires `onLongPress` after `ms` of holding without moving; suppresses the trailing click and context menu. */
export function longpress(opts: { ms?: number; onLongPress: () => void }): Attachment<HTMLElement> {
  const ms = opts.ms ?? 450
  return (node) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let startX = 0
    let startY = 0
    let fired = false

    const clear = () => { if (timer) { clearTimeout(timer); timer = null } }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      fired = false
      startX = e.clientX
      startY = e.clientY
      clear()
      timer = setTimeout(() => { timer = null; fired = true; opts.onLongPress() }, ms)
    }
    const onMove = (e: PointerEvent) => {
      if (timer && (Math.abs(e.clientX - startX) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - startY) > MOVE_TOLERANCE_PX)) clear()
    }
    const onClick = (e: MouseEvent) => {
      if (fired) { e.preventDefault(); e.stopImmediatePropagation(); fired = false }
    }
    const onContext = (e: Event) => e.preventDefault()

    node.addEventListener('pointerdown', onDown)
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerup', clear)
    node.addEventListener('pointercancel', clear)
    node.addEventListener('pointerleave', clear)
    node.addEventListener('click', onClick, true)
    node.addEventListener('contextmenu', onContext)
    return () => {
      clear()
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerup', clear)
      node.removeEventListener('pointercancel', clear)
      node.removeEventListener('pointerleave', clear)
      node.removeEventListener('click', onClick, true)
      node.removeEventListener('contextmenu', onContext)
    }
  }
}
```

`src/lib/draft.ts`:
```ts
import type { KeyValueStorage } from './settings'

type DraftStorage = KeyValueStorage & { removeItem(key: string): void }
const PREFIX = 'lasttime.draft.'
const defaultStorage = (): DraftStorage => globalThis.sessionStorage

export function saveDraft(key: string, value: unknown, storage: DraftStorage = defaultStorage()): void {
  storage.setItem(PREFIX + key, JSON.stringify(value))
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
  storage.removeItem(PREFIX + key)
}
```

Run: `npx vitest run tests/router.test.ts tests/draft.test.ts`
Expected: 全部 passed。

- [ ] **Step 7: app.css 加字型與共用樣式**

在 `src/app.css` 最前面加：
```css
@font-face {
  font-family: 'Fraunces';
  src: url('./assets/fonts/Fraunces-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-display: block;
}
```
在檔尾加：
```css
.num-font { font-family: 'Fraunces', Georgia, serif; font-variation-settings: 'opsz' 144; font-variant-numeric: tabular-nums; line-height: 1; }
.muted { color: var(--muted); }
.danger { color: var(--danger); }
.btn { border: 0; border-radius: 999px; padding: 0.75rem 1.25rem; background: var(--surface); color: var(--text); box-shadow: inset 0 0 0 1px var(--line); }
.btn.primary { background: var(--accent); color: #fff; box-shadow: none; }
.btn.danger { background: transparent; color: var(--danger); box-shadow: inset 0 0 0 1px var(--danger); }
.btn:disabled { opacity: 0.45; cursor: default; }
.icon-btn { border: 0; background: transparent; padding: 0.5rem; border-radius: 50%; min-width: 2.75rem; min-height: 2.75rem; display: inline-grid; place-items: center; }
.field { display: grid; gap: 0.35rem; margin-bottom: 1rem; }
.field > span { font-size: 0.85rem; color: var(--muted); }
.field input, .field textarea, .field select { width: 100%; padding: 0.7rem 0.85rem; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.page { max-width: 600px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; }
```

- [ ] **Step 8: Sheet.svelte 與 Toast.svelte**

`src/components/Sheet.svelte`:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { sheets } from '../lib/sheet.svelte'

  let { title, children }: { title: string; children: Snippet } = $props()
  let panel: HTMLElement | undefined = $state()

  $effect(() => {
    panel?.querySelector('.body')?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
  })
</script>

<div class="backdrop" role="presentation" onclick={() => sheets.close()}></div>
<section class="sheet" role="dialog" aria-modal="true" aria-label={title} bind:this={panel}>
  <header>
    <h2>{title}</h2>
    <button class="icon-btn" aria-label="關閉" onclick={() => sheets.close()}>✕</button>
  </header>
  <div class="body">{@render children()}</div>
</section>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); z-index: 40; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; max-width: 600px; margin: 0 auto; max-height: 92dvh; overflow: auto; background: var(--surface); border-radius: 20px 20px 0 0; padding: 0.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 30px rgb(0 0 0 / 0.15); }
  header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
</style>
```

`src/components/Toast.svelte`:
```svelte
<script lang="ts">
  import { toasts } from '../lib/toast.svelte'
</script>

{#if toasts.current}
  {#key toasts.current.id}
    <div class="toast" role="status" aria-live="polite">
      <span class="msg">{toasts.current.message}</span>
      {#each toasts.current.actions as a (a.label)}
        <button onclick={() => { a.run(); toasts.dismiss() }}>{a.label}</button>
      {/each}
    </div>
  {/key}
{/if}

<style>
  .toast { position: fixed; left: 50%; bottom: calc(5.5rem + env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(92vw, 560px); display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 14px; background: var(--toast-bg); color: var(--toast-text); box-shadow: 0 6px 24px rgb(0 0 0 / 0.25); z-index: 60; }
  .msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { border: 0; background: transparent; color: var(--accent); font-weight: 600; padding: 0.4rem 0.5rem; }
</style>
```

- [ ] **Step 9: App.svelte 與 main.ts**

`src/App.svelte`（頁面元件在後續 task 建立；這一步先放佔位，Task 10–15 逐一替換）:
```svelte
<script lang="ts">
  import { store } from './lib/app-store'
  import { router } from './lib/router.svelte'
  import { sheets } from './lib/sheet.svelte'
  import Toast from './components/Toast.svelte'

  // Theme: data-theme on <html> + theme-color meta
  $effect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const t = store.settings.theme
      const dark = t === 'dark' || (t === 'system' && mq.matches)
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121411' : '#f6f7f4')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  })

  // Clock: re-evaluate 剛剛/N 小時 every minute and when returning to the foreground
  $effect(() => {
    const id = setInterval(() => store.tick(), 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') store.tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  })
</script>

{#if store.ready}
  {#if router.route.name === 'home'}
    <p class="page">首頁（Task 10）</p>
  {:else if router.route.name === 'item'}
    <p class="page">細節（Task 11）</p>
  {:else}
    <p class="page">設定（Task 15）</p>
  {/if}
{/if}

{#if sheets.current}
  <!-- Task 12–15 fill in each kind -->
{/if}

<Toast />
```

`src/main.ts`:
```ts
import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { store } from './lib/app-store'
import { router } from './lib/router.svelte'
import { sheets } from './lib/sheet.svelte'

router.start()
sheets.start()
void store.init()
if (navigator.storage?.persist) void navigator.storage.persist()

mount(App, { target: document.getElementById('app')! })
```

- [ ] **Step 10: 檢查**

Run: `npm test && npm run check && npm run build`
Expected: 全綠；build 產出的 `dist/assets/` 含 `Fraunces-latin-*.woff2`。

手動：`npm run dev`，開 `http://localhost:5173/last-time/`，看到「首頁（Task 10）」；改網址 `#/settings` 看到「設定」；系統切深色時背景變深。

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Add app shell: routing, sheets, toasts, long-press, drafts, Fraunces font

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 首頁

**Files:**
- Create: `src/components/Home.svelte`, `src/components/ItemRow.svelte`, `src/components/SearchBar.svelte`, `src/components/EmptyState.svelte`, `src/components/BackupBanner.svelte`, `src/lib/log-flow.ts`
- Modify: `src/App.svelte`（home 分支換成 `<Home />`）

**Interfaces:**
- Consumes: `store`、`router`、`sheets`、`toasts`、`vibrate`、`longpress`、`since`/`sinceParts`/`numberStyle`/`isDue`/`sortItemsForHome`/`recent7`/`backupBannerVisible`、`formatShort`/`formatTime`、`saveDraft`/`loadDraft`/`clearDraft`
- Produces:
  ```ts
  // log-flow.ts — 首頁長按、細節頁「立即記錄」、搜尋框完成鍵共用
  export async function logAndToast(result: Promise<LogResult>): Promise<LogResult | null>
  // 成功：vibrate(30)、toast「已記錄 {emoji} {name} {HH:mm}」+ 復原 / 備註；失敗：toast 錯誤訊息，回 null
  ```
- `ItemRow.svelte` props：`item: Item`, `lastTs: number | undefined`, `now: number`, `flash: boolean`, `onopen: () => void`, `onlog: () => void`
- `SearchBar.svelte` props：`value: string`（bindable）, `onsubmit: () => void`, `autofocus: boolean`
- `BackupBanner.svelte` props：`onlater: () => void`
- `EmptyState.svelte` props：`onpick: (text: string) => void`

- [ ] **Step 1: log-flow.ts**

```ts
import { toasts } from './toast.svelte'
import { sheets } from './sheet.svelte'
import { store } from './app-store'
import { vibrate } from './haptics'
import { formatTime } from './format'
import { EmptyNameError, FutureTimeError, type LogResult } from './store.svelte'

export async function logAndToast(pending: Promise<LogResult>): Promise<LogResult | null> {
  let result: LogResult
  try {
    result = await pending
  } catch (e) {
    const msg = e instanceof EmptyNameError ? '請輸入名稱' : e instanceof FutureTimeError ? '時間不能是未來' : '儲存失敗，請再試一次'
    toasts.show(msg)
    return null
  }
  vibrate(30)
  toasts.show(`已記錄 ${result.item.emoji} ${result.item.name} ${formatTime(result.record.ts)}`, [
    { label: '復原', run: () => void store.undoLog(result) },
    { label: '備註', run: () => sheets.open({ kind: 'edit-record', recordId: result.record.id }) },
  ])
  return result
}
```

- [ ] **Step 2: ItemRow.svelte**

```svelte
<script lang="ts">
  import type { Item } from '../lib/types'
  import { since, sinceParts, numberStyle, isDue } from '../lib/calc'
  import { formatShort } from '../lib/format'
  import { longpress } from '../lib/longpress'

  let { item, lastTs, now, flash, onopen, onlog }: {
    item: Item; lastTs: number | undefined; now: number; flash: boolean; onopen: () => void; onlog: () => void
  } = $props()

  const s = $derived(lastTs === undefined ? null : since(lastTs, now))
  const parts = $derived(s ? sinceParts(s) : { number: '', unit: '' })
  const style = $derived(s ? numberStyle(s) : { fontSizePx: 18, fontWeight: 420 })
  const due = $derived(s ? isDue(item.expectDays, s) : false)
</script>

<li class:flash class:due>
  <div class="row" role="button" tabindex="0"
       onclick={onopen}
       onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onopen() } }}
       {@attach longpress({ onLongPress: onlog })}>
    <span class="emoji" aria-hidden="true">{item.emoji}</span>
    <span class="name">{item.name}</span>
    <span class="since">
      {#if s}
        <span class="num num-font" style:font-size="{style.fontSizePx / 16}rem" style:font-weight={style.fontWeight}>{parts.number}</span>
        <span class="unit">{parts.unit}</span>
        <span class="when muted">{due ? '該做了 · ' : ''}{formatShort(lastTs!)}</span>
      {:else}
        <span class="when muted">尚未記錄</span>
      {/if}
    </span>
  </div>
  <button class="sr-only" onclick={onlog}>記一筆：{item.name}</button>
</li>

<style>
  li { list-style: none; border-bottom: 1px solid var(--line); transition: background 0.6s; }
  li.flash { background: var(--accent-soft); transition: none; }
  .row { display: grid; grid-template-columns: 2.75rem 1fr auto; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: pan-y; }
  .emoji { font-size: 1.5rem; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 12px; background: var(--surface); }
  .name { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .since { display: grid; justify-items: end; text-align: right; }
  .num { color: var(--text); }
  .unit { font-size: 0.8rem; }
  .due .num, .due .unit, .due .when { color: var(--danger); }
  .when { font-size: 0.75rem; }
</style>
```

- [ ] **Step 3: SearchBar.svelte、EmptyState.svelte、BackupBanner.svelte**

`src/components/SearchBar.svelte`:
```svelte
<script lang="ts">
  let { value = $bindable(''), onsubmit, autofocus = false }: { value: string; onsubmit: () => void; autofocus?: boolean } = $props()
  let input: HTMLInputElement | undefined = $state()
  $effect(() => { if (autofocus) input?.focus() })
</script>

<form class="bar" onsubmit={(e) => { e.preventDefault(); onsubmit() }}>
  <input bind:this={input} bind:value type="search" enterkeyhint="done" autocomplete="off"
         placeholder="搜尋或新增一件事" aria-label="搜尋或新增一件事" />
</form>

<style>
  .bar { position: sticky; bottom: 0; padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom)); background: var(--bg); }
  input { width: 100%; padding: 0.85rem 1rem; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-size: 1rem; }
</style>
```

`src/components/EmptyState.svelte`:
```svelte
<script lang="ts">
  let { onpick }: { onpick: (text: string) => void } = $props()
  const samples = ['吃藥', '換濾心', '換瓦斯', '打電話給爸媽', '剪頭髮', '繳帳單']
</script>

<div class="empty">
  <p>記下你上次做某件事的時間，之後一眼就知道過了幾天。</p>
  <p class="muted">在下面輸入一件事，按完成就記下第一筆。</p>
  <div class="chips">
    {#each samples as s (s)}
      <button class="btn" onclick={() => onpick(s)}>{s}</button>
    {/each}
  </div>
</div>

<style>
  .empty { padding: 3rem 1.5rem; text-align: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
</style>
```

`src/components/BackupBanner.svelte`:
```svelte
<script lang="ts">
  import { router } from '../lib/router.svelte'
  let { onlater }: { onlater: () => void } = $props()
</script>

<div class="banner" role="note">
  <span>資料只存在這支手機的瀏覽器裡，建議備份一份。</span>
  <button class="btn" onclick={() => router.navigate({ name: 'settings' })}>去備份</button>
  <button class="icon-btn" onclick={onlater}>之後</button>
</div>

<style>
  .banner { display: flex; align-items: center; gap: 0.5rem; margin: 0 1rem 0.5rem; padding: 0.6rem 0.9rem; border-radius: var(--radius); background: var(--accent-soft); font-size: 0.85rem; }
  span { flex: 1; }
</style>
```

- [ ] **Step 4: Home.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sortItemsForHome, recent7, backupBannerVisible, normalizeName, DAY_MS } from '../lib/calc'
  import { logAndToast } from '../lib/log-flow'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import ItemRow from './ItemRow.svelte'
  import SearchBar from './SearchBar.svelte'
  import EmptyState from './EmptyState.svelte'
  import BackupBanner from './BackupBanner.svelte'

  const DRAFT_KEY = 'home.search'
  let query = $state(loadDraft<string>(DRAFT_KEY) ?? '')
  $effect(() => { if (query) saveDraft(DRAFT_KEY, query); else clearDraft(DRAFT_KEY) })

  // ?focus=1 comes from the "新增項目" app shortcut
  const wantFocus = new URLSearchParams(location.search).get('focus') === '1'
  if (wantFocus) history.replaceState(history.state, '', location.pathname + location.hash)

  const sorted = $derived(sortItemsForHome(store.items, store.lastTs))
  const stats = $derived(recent7(store.items, store.lastTs, store.now))
  const q = $derived(normalizeName(query))
  const visible = $derived(q ? sorted.filter((i) => i.name.includes(q)) : sorted)
  const exact = $derived(q ? store.findByName(q) : undefined)
  const showBanner = $derived(backupBannerVisible(store.records.length, store.settings, store.now))

  let flashId = $state<string | null>(null)
  function flash(id: string) {
    flashId = id
    setTimeout(() => { if (flashId === id) flashId = null }, 700)
  }

  async function logItem(id: string) {
    const r = await logAndToast(store.logNow(id))
    if (r) flash(id)
  }

  async function submit() {
    if (!q) return
    const r = await logAndToast(store.addItemAndLog(q))
    if (r) { query = ''; flash(r.item.id) }
  }
</script>

<div class="page">
  <header>
    <h1>上次</h1>
    <div class="stats" aria-label="最近 7 天做過 {stats.done} / {stats.total}">
      <span class="num-font big">{stats.done} / {stats.total}</span>
      <span class="muted small">最近 7 天做過</span>
    </div>
    <button class="icon-btn" aria-label="設定" onclick={() => router.navigate({ name: 'settings' })}>⚙︎</button>
  </header>

  {#if showBanner}
    <BackupBanner onlater={() => store.updateSettings({ backupSnoozeUntil: store.now + 7 * DAY_MS })} />
  {/if}

  {#if store.items.length === 0 && !q}
    <EmptyState onpick={(t) => { query = t }} />
  {:else}
    <ul class="list">
      {#if q && !exact}
        <li class="add"><button onclick={submit}>＋ 新增『{q}』，以現在的時間記下第一筆</button></li>
      {/if}
      {#each visible as item (item.id)}
        <ItemRow {item} lastTs={store.lastTs.get(item.id)} now={store.now} flash={flashId === item.id}
                 onopen={() => router.navigate({ name: 'item', id: item.id })}
                 onlog={() => logItem(item.id)} />
      {/each}
    </ul>
    <p class="hint muted small">點一下看細節，長按直接記一筆</p>
  {/if}

  <div class="spacer"></div>
  <SearchBar bind:value={query} onsubmit={submit} autofocus={wantFocus} />
</div>

<style>
  header { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 0.5rem; padding: 1rem 1rem 0.5rem; }
  h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
  .stats { display: grid; justify-items: end; }
  .big { font-size: 1.3rem; font-weight: 600; }
  .small { font-size: 0.75rem; }
  .list { margin: 0; padding: 0; }
  .add button { width: 100%; text-align: left; border: 0; background: var(--accent-soft); color: var(--accent); padding: 0.9rem 1rem; font-weight: 600; }
  .hint { text-align: center; margin: 1rem 0; }
  .spacer { flex: 1; }
</style>
```

- [ ] **Step 5: App.svelte 換上 Home**

把 `<p class="page">首頁（Task 10）</p>` 換成 `<Home />`，並 `import Home from './components/Home.svelte'`。

- [ ] **Step 6: 檢查**

Run: `npm run check && npm test`
Expected: 0 errors、全綠。

手動（`npm run dev`，用 Chrome 裝置模擬或實機）：
1. 空狀態有六個膠囊，點「吃藥」填入輸入框。
2. 按 Enter：出現列、數字「剛剛」、提示「已記錄 💊 吃藥 HH:MM」。
3. 按「復原」：列消失、回空狀態。
4. 再新增後長按 0.5 秒：列閃綠、震動（實機）、提示出現；沒有跳出文字選取。
5. 輸入「吃」可過濾；輸入不存在的名稱時最上面出現「＋ 新增」列。
6. 右上角齒輪切到 `#/settings` 佈位。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add home screen with long-press logging, undo toast and search-to-add

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 項目細節頁

**Files:**
- Create: `src/components/ItemDetail.svelte`, `src/components/Timeline.svelte`
- Modify: `src/App.svelte`（item 分支換成 `<ItemDetail id={router.route.id} />`）

**Interfaces:**
- Consumes: `store`、`router`、`sheets`、`logAndToast`、`since`/`sinceParts`/`isDue`/`averageIntervalDays`/`formatIntervalDays`/`gapsBetween`、`formatLong`
- `ItemDetail.svelte` props：`id: string`
- `Timeline.svelte` props：`records: ItemRecord[]`（新到舊）, `onpick: (recordId: string) => void`

- [ ] **Step 1: Timeline.svelte**

```svelte
<script lang="ts">
  import type { ItemRecord } from '../lib/types'
  import { gapsBetween } from '../lib/calc'
  import { formatLong } from '../lib/format'

  let { records, onpick }: { records: ItemRecord[]; onpick: (recordId: string) => void } = $props()
  const gaps = $derived(gapsBetween(records.map((r) => r.ts)))
</script>

<ol class="timeline">
  {#each records as r, i (r.id)}
    <li>
      <button class="entry" onclick={() => onpick(r.id)}>
        <span class="dot" aria-hidden="true"></span>
        <span class="when">{formatLong(r.ts)}</span>
        {#if r.note}<span class="note muted">{r.note}</span>{/if}
      </button>
      {#if i < records.length - 1}
        <div class="gap muted small">{gaps[i] === 0 ? '同一天' : `空缺 ${gaps[i]} 天`}</div>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .timeline { list-style: none; margin: 0; padding: 0 1rem; }
  .entry { display: grid; grid-template-columns: 1rem 1fr; column-gap: 0.75rem; width: 100%; text-align: left; border: 0; background: transparent; padding: 0.75rem 0; }
  .dot { width: 0.6rem; height: 0.6rem; margin-top: 0.4rem; border-radius: 50%; background: var(--accent); }
  .when { font-size: 0.95rem; }
  .note { grid-column: 2; white-space: pre-wrap; font-size: 0.9rem; }
  .gap { padding: 0 0 0 1.75rem; font-size: 0.75rem; }
  .small { font-size: 0.75rem; }
</style>
```

- [ ] **Step 2: ItemDetail.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { logAndToast } from '../lib/log-flow'
  import { since, sinceParts, isDue, averageIntervalDays, formatIntervalDays } from '../lib/calc'
  import Timeline from './Timeline.svelte'

  let { id }: { id: string } = $props()

  const item = $derived(store.itemById(id))
  const records = $derived(store.recordsOf(id))
  const last = $derived(records[0]?.ts)
  const s = $derived(last === undefined ? null : since(last, store.now))
  const parts = $derived(s ? sinceParts(s) : null)
  const due = $derived(item && s ? isDue(item.expectDays, s) : false)
  const avg = $derived(averageIntervalDays(records.map((r) => r.ts)))

  // Item vanished (deleted) → go home
  $effect(() => { if (store.ready && !item) router.replace({ name: 'home' }) })
</script>

{#if item}
  <div class="page">
    <header>
      <button class="icon-btn" aria-label="返回" onclick={() => router.back()}>‹</button>
      <div class="title">
        <h1><span aria-hidden="true">{item.emoji}</span> {item.name}</h1>
        <p class="muted small">
          {#if item.expectDays}大概每 {item.expectDays} 天一次{/if}
          {#if item.archived}{item.expectDays ? ' · ' : ''}已封存{/if}
        </p>
      </div>
      <button class="icon-btn" aria-label="編輯項目" onclick={() => sheets.open({ kind: 'edit-item', itemId: id })}>✎</button>
    </header>

    <section class="summary">
      <div>
        <span class="label muted">距上次</span>
        <span class="val num-font" class:danger={due}>{parts ? parts.number + parts.unit : '—'}</span>
      </div>
      <div>
        <span class="label muted">平均間隔</span>
        <span class="val num-font">{avg === null ? '' : formatIntervalDays(avg) + ' 天'}</span>
        {#if avg === null}<span class="muted tiny">記滿 3 次後計算</span>{/if}
      </div>
      <div>
        <span class="label muted">共幾次</span>
        <span class="val num-font">{records.length}</span>
      </div>
    </section>

    <Timeline {records} onpick={(rid) => sheets.open({ kind: 'edit-record', recordId: rid })} />

    <div class="spacer"></div>
    <footer>
      <button class="btn primary wide" onclick={() => logAndToast(store.logNow(id))}>立即記錄</button>
      <button class="btn" onclick={() => sheets.open({ kind: 'backdate', itemId: id })}>補其他日期</button>
    </footer>
  </div>
{/if}

<style>
  header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.25rem; padding: 0.75rem 0.5rem; }
  h1 { margin: 0; font-size: 1.25rem; font-weight: 700; }
  .title p { margin: 0.1rem 0 0; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding: 0.5rem 1rem 1rem; }
  .summary > div { display: grid; gap: 0.2rem; padding: 0.75rem; border-radius: var(--radius); background: var(--surface); }
  .label { font-size: 0.75rem; }
  .val { font-size: 1.4rem; font-weight: 600; min-height: 1.6rem; }
  .tiny { font-size: 0.7rem; }
  .small { font-size: 0.8rem; }
  .spacer { flex: 1; }
  footer { position: sticky; bottom: 0; display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom)); background: var(--bg); }
  .wide { width: 100%; }
</style>
```

- [ ] **Step 3: 接到 App.svelte**

item 分支：`<ItemDetail id={router.route.id} />`（在 `{:else if router.route.name === 'item'}` 內 TypeScript 會自動縮小型別）。

- [ ] **Step 4: 檢查**

Run: `npm run check`
手動：首頁點一列進細節；三個摘要數字正確；時間軸新到舊、兩筆之間「空缺 N 天」或「同一天」；「立即記錄」出現提示與復原；返回鍵回首頁；把網址改成不存在的 id 會自動回首頁。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add item detail page with timeline and summary

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: 編輯項目抽屜

**Files:**
- Create: `src/components/EditItemSheet.svelte`
- Modify: `src/App.svelte`（sheet host 加 `edit-item` 分支）

**Interfaces:**
- Consumes: `store`、`sheets`、`router`、`toasts`、`QUICK_EMOJIS`、`saveDraft`/`loadDraft`/`clearDraft`、`EmptyNameError`
- props：`itemId: string`

- [ ] **Step 1: EditItemSheet.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { router } from '../lib/router.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { QUICK_EMOJIS } from '../lib/emoji'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { EmptyNameError } from '../lib/store.svelte'
  import Sheet from './Sheet.svelte'

  let { itemId }: { itemId: string } = $props()
  const item = store.itemById(itemId)
  const KEY = `edit-item.${itemId}`
  type Draft = { name: string; emoji: string; expectDays: string; archived: boolean }
  const draft = loadDraft<Draft>(KEY)

  let name = $state(draft?.name ?? item?.name ?? '')
  let emoji = $state(draft?.emoji ?? item?.emoji ?? '📌')
  let expectDays = $state(draft?.expectDays ?? (item?.expectDays === null || item?.expectDays === undefined ? '' : String(item.expectDays)))
  let archived = $state(draft?.archived ?? item?.archived ?? false)
  $effect(() => { saveDraft(KEY, { name, emoji, expectDays, archived } satisfies Draft) })

  const recordCount = $derived(store.recordsOf(itemId).length)

  async function save() {
    try {
      await store.updateItem(itemId, { name, emoji, expectDays, archived })
      clearDraft(KEY)
      sheets.close()
    } catch (e) {
      toasts.show(e instanceof EmptyNameError ? '請輸入名稱' : '儲存失敗，請再試一次')
    }
  }

  async function remove() {
    if (!confirm(`刪除「${item?.name ?? ''}」？會連同 ${recordCount} 筆紀錄一起刪除，無法復原。`)) return
    clearDraft(KEY)
    sheets.closeThen(async () => {
      await store.deleteItem(itemId)
      router.replace({ name: 'home' })
    })
  }
</script>

<Sheet title="編輯項目">
  <label class="field"><span>名稱</span><input bind:value={name} required /></label>
  <label class="field"><span>圖示</span><input bind:value={emoji} maxlength="8" /></label>
  <div class="quick" role="group" aria-label="常用圖示">
    {#each QUICK_EMOJIS as q (q)}
      <button type="button" class:on={q === emoji} onclick={() => { emoji = q }} aria-label="選擇 {q}">{q}</button>
    {/each}
  </div>
  <label class="field"><span>大概多久做一次（天，留空不判斷）</span><input bind:value={expectDays} inputmode="numeric" pattern="[0-9]*" placeholder="例如 14" /></label>
  <label class="toggle"><input type="checkbox" bind:checked={archived} /> 封存（首頁不顯示，紀錄保留）</label>
  <div class="actions">
    <button class="btn danger" onclick={remove}>刪除項目</button>
    <button class="btn primary" onclick={save}>儲存</button>
  </div>
</Sheet>

<style>
  .quick { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: -0.5rem 0 1rem; }
  .quick button { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; width: 2.5rem; height: 2.5rem; font-size: 1.25rem; }
  .quick button.on { border-color: var(--accent); background: var(--accent-soft); }
  .toggle { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.25rem; }
  .actions { display: flex; justify-content: space-between; gap: 0.5rem; }
</style>
```

- [ ] **Step 2: App.svelte sheet host**

```svelte
{#if sheets.current?.kind === 'edit-item'}
  {#key sheets.current.itemId}<EditItemSheet itemId={sheets.current.itemId} />{/key}
{/if}
```

- [ ] **Step 3: 檢查**

Run: `npm run check`
手動：細節頁鉛筆 → 改名、點快選 emoji、設 14 天、封存 → 儲存，細節頁小字更新；返回鍵關抽屜；刪除彈確認，確認後回首頁且列消失；設「0」儲存後細節頁不顯示「大概每 N 天」。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add edit-item sheet

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: 編輯紀錄抽屜

**Files:**
- Create: `src/components/EditRecordSheet.svelte`
- Modify: `src/App.svelte`（加 `edit-record` 分支）

**Interfaces:**
- Consumes: `store`、`sheets`、`toasts`、`toDatetimeLocalValue`/`fromDatetimeLocalValue`、`FutureTimeError`、draft
- props：`recordId: string`

- [ ] **Step 1: EditRecordSheet.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../lib/format'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { FutureTimeError } from '../lib/store.svelte'
  import Sheet from './Sheet.svelte'

  let { recordId }: { recordId: string } = $props()
  const record = store.recordById(recordId)
  const item = $derived(record ? store.itemById(record.itemId) : undefined)
  const KEY = `edit-record.${recordId}`
  type Draft = { when: string; note: string }
  const draft = loadDraft<Draft>(KEY)

  let when = $state(draft?.when ?? (record ? toDatetimeLocalValue(record.ts) : ''))
  let note = $state(draft?.note ?? record?.note ?? '')
  $effect(() => { saveDraft(KEY, { when, note } satisfies Draft) })

  const max = $derived(toDatetimeLocalValue(store.now))

  async function save() {
    const ts = fromDatetimeLocalValue(when)
    if (ts === null) { toasts.show('請選擇時間'); return }
    try {
      await store.updateRecord(recordId, { ts, note: note.trim() })
      clearDraft(KEY)
      sheets.close()
    } catch (e) {
      toasts.show(e instanceof FutureTimeError ? '時間不能是未來' : '儲存失敗，請再試一次')
    }
  }

  async function remove() {
    if (!confirm('刪除這筆紀錄？')) return
    clearDraft(KEY)
    await store.deleteRecord(recordId)
    sheets.close()
  }

  $effect(() => { if (!record) sheets.close() })
</script>

<Sheet title={item ? `${item.emoji} ${item.name}` : '紀錄'}>
  <label class="field"><span>時間</span><input type="datetime-local" bind:value={when} {max} step="60" /></label>
  <label class="field"><span>備註</span><textarea bind:value={note} rows="3" placeholder="可留空"></textarea></label>
  <div class="actions">
    <button class="btn danger" onclick={remove}>刪除這筆</button>
    <button class="btn primary" onclick={save}>儲存</button>
  </div>
</Sheet>

<style>
  .actions { display: flex; justify-content: space-between; gap: 0.5rem; }
</style>
```

- [ ] **Step 2: App.svelte**

```svelte
{:else if sheets.current?.kind === 'edit-record'}
  {#key sheets.current.recordId}<EditRecordSheet recordId={sheets.current.recordId} />{/key}
```

- [ ] **Step 3: 檢查**

手動：首頁記一筆 → 提示的「備註」開抽屜，標題有 emoji 與名稱；改時間到昨天 08:00、備註「早上」→ 儲存；細節頁時間軸顯示新時間與備註；選未來時間儲存會提示「時間不能是未來」；刪除這筆有確認。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add edit-record sheet

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: 補其他日期抽屜

**Files:**
- Create: `src/lib/calendar.ts`, `src/components/MonthCalendar.svelte`, `src/components/BackdateSheet.svelte`
- Modify: `src/App.svelte`（加 `backdate` 分支）
- Test: `tests/calendar.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // calendar.ts
  export interface MonthCell { key: string; day: number; ts: number; inMonth: boolean; future: boolean; today: boolean }
  export function monthGrid(year: number, month0: number, todayTs: number): MonthCell[]   // 週一開始，6 週 42 格
  export function monthLabel(year: number, month0: number): string                          // "2026 年 9 月"
  export function combineDateTime(dayTs: number, hhmm: string): number | null              // 當地日 + "12:00"
  ```
- `MonthCalendar.svelte` props：`year`, `month0`, `todayTs`, `selected: Set<string>`, `marked: Set<string>`, `ontoggle: (key: string) => void`
- `BackdateSheet.svelte` props：`itemId: string`

- [ ] **Step 1: 失敗測試**

`tests/calendar.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { monthGrid, monthLabel, combineDateTime } from '../src/lib/calendar'

const today = new Date(2026, 8, 20, 10).getTime() // Sun 2026-09-20

describe('monthGrid', () => {
  const g = monthGrid(2026, 8, today)
  it('has 42 cells starting on a Monday', () => {
    expect(g).toHaveLength(42)
    expect(new Date(g[0]!.ts).getDay()).toBe(1)
  })
  it('Sept 2026 starts on Tuesday → first cell is Aug 31', () => {
    expect(g[0]).toMatchObject({ day: 31, inMonth: false })
    expect(g[1]).toMatchObject({ day: 1, inMonth: true, key: '2026-09-01' })
  })
  it('marks today and future', () => {
    const t = g.find((c) => c.key === '2026-09-20')!
    expect(t.today).toBe(true)
    expect(t.future).toBe(false)
    expect(g.find((c) => c.key === '2026-09-21')!.future).toBe(true)
    expect(g.find((c) => c.key === '2026-09-19')!.future).toBe(false)
  })
  it('label', () => expect(monthLabel(2026, 8)).toBe('2026 年 9 月'))
})

describe('combineDateTime', () => {
  it('applies HH:mm to a local day', () => {
    const day = new Date(2026, 8, 5).getTime()
    expect(combineDateTime(day, '12:00')).toBe(new Date(2026, 8, 5, 12, 0).getTime())
    expect(combineDateTime(day, '')).toBeNull()
    expect(combineDateTime(day, '25:00')).toBeNull()
  })
})
```

Run: `npx vitest run tests/calendar.test.ts`
Expected: FAIL。

- [ ] **Step 2: calendar.ts**

```ts
import { startOfDay } from './calc'
import { toDateKey } from './format'

export interface MonthCell {
  key: string
  day: number
  ts: number
  inMonth: boolean
  future: boolean
  today: boolean
}

/** 6 rows × 7 columns, weeks start on Monday. */
export function monthGrid(year: number, month0: number, todayTs: number): MonthCell[] {
  const first = new Date(year, month0, 1)
  const offset = (first.getDay() + 6) % 7 // Mon=0 … Sun=6
  const todayStart = startOfDay(todayTs)
  const cells: MonthCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month0, 1 - offset + i)
    const ts = d.getTime()
    cells.push({
      key: toDateKey(ts),
      day: d.getDate(),
      ts,
      inMonth: d.getMonth() === month0,
      future: ts > todayStart,
      today: ts === todayStart,
    })
  }
  return cells
}

export function monthLabel(year: number, month0: number): string {
  return `${year} 年 ${month0 + 1} 月`
}

export function combineDateTime(dayTs: number, hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  const d = new Date(dayTs)
  d.setHours(h, mi, 0, 0)
  return d.getTime()
}
```

Run: `npx vitest run tests/calendar.test.ts`
Expected: 全部 passed。

- [ ] **Step 3: MonthCalendar.svelte**

```svelte
<script lang="ts">
  import { monthGrid } from '../lib/calendar'

  let { year, month0, todayTs, selected, marked, ontoggle }: {
    year: number; month0: number; todayTs: number; selected: Set<string>; marked: Set<string>; ontoggle: (key: string) => void
  } = $props()
  const cells = $derived(monthGrid(year, month0, todayTs))
  const weekdays = ['一', '二', '三', '四', '五', '六', '日']
</script>

<div class="cal" role="grid">
  {#each weekdays as w (w)}<div class="wd muted" role="columnheader">{w}</div>{/each}
  {#each cells as c (c.key)}
    <button type="button" role="gridcell" class="cell"
            class:out={!c.inMonth} class:today={c.today} class:sel={selected.has(c.key)}
            disabled={c.future} aria-pressed={selected.has(c.key)} aria-label={c.key}
            onclick={() => ontoggle(c.key)}>
      <span>{c.day}</span>
      {#if marked.has(c.key)}<i class="mark" aria-hidden="true"></i>{/if}
    </button>
  {/each}
</div>

<style>
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .wd { text-align: center; font-size: 0.75rem; padding: 0.25rem 0; }
  .cell { position: relative; aspect-ratio: 1; border: 0; border-radius: 10px; background: transparent; font-size: 0.95rem; display: grid; place-items: center; }
  .cell.out { opacity: 0.35; }
  .cell:disabled { color: var(--muted); opacity: 0.4; }
  .cell.today { box-shadow: inset 0 0 0 2px var(--accent); }
  .cell.sel { background: var(--accent); color: #fff; }
  .mark { position: absolute; bottom: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
  .cell.sel .mark { background: #fff; }
</style>
```

- [ ] **Step 4: BackdateSheet.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { monthLabel, combineDateTime } from '../lib/calendar'
  import { toDateKey } from '../lib/format'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import Sheet from './Sheet.svelte'
  import MonthCalendar from './MonthCalendar.svelte'

  let { itemId }: { itemId: string } = $props()
  const KEY = `backdate.${itemId}`
  type Draft = { selected: string[]; time: string; year: number; month0: number }
  const draft = loadDraft<Draft>(KEY)
  const today = new Date(store.now)

  let year = $state(draft?.year ?? today.getFullYear())
  let month0 = $state(draft?.month0 ?? today.getMonth())
  let time = $state(draft?.time ?? '12:00')
  let selected = $state(new Set<string>(draft?.selected ?? []))
  $effect(() => { saveDraft(KEY, { selected: [...selected], time, year, month0 } satisfies Draft) })

  const marked = $derived(new Set(store.recordsOf(itemId).map((r) => toDateKey(r.ts))))

  function toggle(key: string) {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key); else next.add(key)
    selected = next
  }
  function shift(delta: number) {
    const d = new Date(year, month0 + delta, 1)
    year = d.getFullYear(); month0 = d.getMonth()
  }

  async function add() {
    const tss: number[] = []
    for (const key of selected) {
      const [y, m, d] = key.split('-').map(Number)
      const ts = combineDateTime(new Date(y!, m! - 1, d!).getTime(), time)
      if (ts === null) { toasts.show('請輸入有效時間'); return }
      tss.push(ts)
    }
    try {
      await store.addRecords(itemId, tss)
      clearDraft(KEY)
      sheets.close()
      toasts.show(`已加入 ${tss.length} 筆`)
    } catch {
      toasts.show('儲存失敗，請再試一次')
    }
  }
</script>

<Sheet title="補其他日期">
  <div class="nav">
    <button class="icon-btn" aria-label="上個月" onclick={() => shift(-1)}>‹</button>
    <strong>{monthLabel(year, month0)}</strong>
    <button class="icon-btn" aria-label="下個月" onclick={() => shift(1)}>›</button>
  </div>
  <MonthCalendar {year} {month0} todayTs={store.now} {selected} {marked} ontoggle={toggle} />
  <label class="field" style="margin-top:1rem"><span>時間（套用到每一天）</span><input type="time" bind:value={time} step="60" /></label>
  <button class="btn primary wide" disabled={selected.size === 0} onclick={add}>加入 {selected.size} 天</button>
</Sheet>

<style>
  .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .wide { width: 100%; }
</style>
```

- [ ] **Step 5: App.svelte**

```svelte
{:else if sheets.current?.kind === 'backdate'}
  {#key sheets.current.itemId}<BackdateSheet itemId={sheets.current.itemId} />{/key}
```

- [ ] **Step 6: 檢查**

Run: `npm test && npm run check`
手動：細節頁「補其他日期」→ 月曆週一開始、今天有外框、未來日期灰且不能點、已有紀錄的日子有點；選 3 天、時間 08:30 →「加入 3 天」→ 細節頁多 3 筆 08:30、提示「已加入 3 筆」。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add backdate sheet with multi-select month calendar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: 設定頁與匯入／匯出

**Files:**
- Create: `src/lib/files.ts`, `src/components/Settings.svelte`, `src/components/ImportSheet.svelte`
- Modify: `src/App.svelte`（settings 分支換 `<Settings />`；加 `import` 分支）

**Interfaces:**
- Produces:
  ```ts
  // files.ts
  export function downloadText(filename: string, text: string): void          // Blob + <a download>
  export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported'
  export async function shareText(filename: string, text: string): Promise<ShareOutcome>   // Web Share API with files
  export function canShareFiles(): boolean
  export function readFileText(file: File): Promise<string>
  ```
- Consumes: `serializeBackup`/`parseBackup`/`summarize`/`planMerge`/`planReplace`、`formatBackupFileName`/`formatLong`、`store`、`sheets`、`toasts`
- `ImportSheet.svelte` props：`backup: ParsedBackup`

- [ ] **Step 1: files.ts**

```ts
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })
  } catch {
    return false
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported'

export async function shareText(filename: string, text: string): Promise<ShareOutcome> {
  if (!canShareFiles()) return 'unsupported'
  const file = new File([text], filename, { type: 'application/json' })
  try {
    await navigator.share({ files: [file], title: filename })
    return 'shared'
  } catch (e) {
    // AbortError = user dismissed the share sheet; anything else we also treat as not shared
    return (e as { name?: string }).name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

export function readFileText(file: File): Promise<string> {
  return file.text()
}
```

- [ ] **Step 2: ImportSheet.svelte**

```svelte
<script lang="ts">
  import type { ParsedBackup } from '../lib/backup'
  import { summarize, planMerge, planReplace } from '../lib/backup'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import Sheet from './Sheet.svelte'

  let { backup }: { backup: ParsedBackup } = $props()
  const s = summarize(backup)
  const exported = s.exportedAt ? new Date(s.exportedAt) : null
  const exportedText = exported && !Number.isNaN(exported.getTime()) ? exported.toLocaleString('zh-TW') : '不明'

  async function merge() {
    const plan = planMerge({ items: store.items, records: store.records }, backup)
    try {
      await store.mergeIn(plan.items, plan.records)
      sheets.close()
      toasts.show(`已匯入 ${plan.items.length} 個項目、${plan.records.length} 筆紀錄`)
    } catch {
      toasts.show('匯入失敗，資料未變動')
    }
  }

  async function replace() {
    if (!confirm('覆蓋現有資料？目前的項目和紀錄會全部刪除，無法復原。')) return
    const plan = planReplace(backup)
    try {
      await store.replaceWith(plan.items, plan.records)
      store.updateSettings({ ...backup.settings })
      sheets.close()
      toasts.show(`已匯入 ${plan.items.length} 個項目、${plan.records.length} 筆紀錄`)
    } catch {
      toasts.show('匯入失敗，資料未變動')
    }
  }
</script>

<Sheet title="匯入備份">
  <dl>
    <dt class="muted">匯出日期</dt><dd>{exportedText}</dd>
    <dt class="muted">項目</dt><dd>{s.itemCount} 個</dd>
    <dt class="muted">紀錄</dt><dd>{s.recordCount} 筆</dd>
  </dl>
  <div class="actions">
    <button class="btn" onclick={merge}>合併到現有資料</button>
    <button class="btn danger" onclick={replace}>覆蓋現有資料</button>
  </div>
  <p class="muted small">合併：已有的項目和紀錄不動，只加入新的。覆蓋：先清空再寫入，並套用備份裡的主題和震動設定。</p>
</Sheet>

<style>
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; margin: 0 0 1rem; }
  dd { margin: 0; }
  .actions { display: grid; gap: 0.5rem; }
  .small { font-size: 0.8rem; }
</style>
```

- [ ] **Step 3: Settings.svelte**

```svelte
<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { serializeBackup, parseBackup } from '../lib/backup'
  import { formatBackupFileName, formatLong } from '../lib/format'
  import { downloadText, shareText, canShareFiles, readFileText } from '../lib/files'
  import type { Theme } from '../lib/types'

  const version = __APP_VERSION__
  const archived = $derived(store.items.filter((i) => i.archived))
  let fileInput: HTMLInputElement | undefined = $state()

  function backupText() {
    return serializeBackup(store.items, store.records, store.settings, store.now)
  }
  function exportBackup() {
    downloadText(formatBackupFileName(store.now), backupText())
    store.updateSettings({ lastBackupAt: store.now, backupSnoozeUntil: null })
    toasts.show('已匯出備份')
  }
  async function shareBackup() {
    const outcome = await shareText(formatBackupFileName(store.now), backupText())
    if (outcome === 'shared') store.updateSettings({ lastBackupAt: store.now, backupSnoozeUntil: null })
    else if (outcome === 'unsupported') toasts.show('這個裝置不支援分享檔案')
  }
  async function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const res = parseBackup(await readFileText(file))
    if (fileInput) fileInput.value = ''
    if (!res.ok) { toasts.show('不是『上次』的備份檔'); return }
    sheets.open({ kind: 'import', backup: res.backup })
  }
  async function clearAll() {
    if (!confirm('清除全部資料？所有項目和紀錄會刪除，無法復原。建議先匯出備份。')) return
    await store.clearAllData()
    toasts.show('已清除全部資料')
    router.navigate({ name: 'home' })
  }
</script>

<div class="page">
  <header>
    <button class="icon-btn" aria-label="返回" onclick={() => router.back()}>‹</button>
    <h1>設定</h1>
  </header>

  <section>
    <h2>備份</h2>
    <p class="muted small">上次備份：{store.settings.lastBackupAt === null ? '尚未備份' : formatLong(store.settings.lastBackupAt)}</p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>匯出備份</button>
      {#if canShareFiles()}<button class="btn" onclick={shareBackup}>分享備份</button>{/if}
      <button class="btn" onclick={() => fileInput?.click()}>匯入備份</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" class="sr-only" onchange={onFile} />
    </div>
  </section>

  <section>
    <h2>外觀</h2>
    <label class="field"><span>主題</span>
      <select value={store.settings.theme} onchange={(e) => store.updateSettings({ theme: (e.target as HTMLSelectElement).value as Theme })}>
        <option value="system">跟隨系統</option><option value="light">淺</option><option value="dark">深</option>
      </select>
    </label>
    <label class="toggle"><input type="checkbox" checked={store.settings.vibrate} onchange={(e) => store.updateSettings({ vibrate: (e.target as HTMLInputElement).checked })} /> 記錄時震動</label>
  </section>

  <section>
    <h2>整理</h2>
    {#if archived.length === 0}
      <p class="muted small">沒有封存的項目。</p>
    {:else}
      <ul class="plain">
        {#each archived as a (a.id)}
          <li><span>{a.emoji} {a.name}</span><button class="btn" onclick={() => store.updateItem(a.id, { archived: false })}>取消封存</button></li>
        {/each}
      </ul>
    {/if}
    <button class="btn danger" onclick={clearAll}>清除全部資料</button>
  </section>

  <section>
    <h2>關於</h2>
    <p class="muted small">版本 {version} · {store.items.length} 個項目 · {store.records.length} 筆紀錄</p>
    <p class="muted small">沒有帳號、沒有伺服器，資料不會離開這支手機。資料存在瀏覽器裡：清除瀏覽器的網站資料或解除安裝瀏覽器會讓資料消失，請定期匯出備份。</p>
  </section>
</div>

<style>
  header { display: flex; align-items: center; gap: 0.25rem; padding: 0.75rem 0.5rem; }
  h1 { margin: 0; font-size: 1.25rem; }
  section { padding: 0.5rem 1rem 1rem; }
  h2 { font-size: 0.9rem; color: var(--muted); font-weight: 600; margin: 0 0 0.5rem; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .toggle { display: flex; gap: 0.5rem; align-items: center; }
  .plain { list-style: none; padding: 0; margin: 0 0 1rem; }
  .plain li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--line); }
  .small { font-size: 0.85rem; }
</style>
```

版本號來源：在 `vite.config.ts` 的 `defineConfig` 內加 `define: { __APP_VERSION__: JSON.stringify(process.env['npm_package_version'] ?? '0.0.0') }`，並在 `src/vite-env.d.ts` 加 `declare const __APP_VERSION__: string`。

- [ ] **Step 4: App.svelte**

settings 分支換 `<Settings />`；sheet host 加：
```svelte
{:else if sheets.current?.kind === 'import'}
  <ImportSheet backup={sheets.current.backup} />
```

- [ ] **Step 5: 檢查**

Run: `npm test && npm run check && npm run build`
手動：
1. 匯出 → 下載「上次備份-YYYY-MM-DD.json」，用編輯器打開內容符合規格 §8；設定頁「上次備份」更新；首頁備份提醒消失。
2. 清除全部資料 → 回首頁空狀態。
3. 匯入剛才的檔案 → 抽屜顯示摘要 → 覆蓋（有二次確認）→ 項目紀錄全回來。
4. 再匯入同一檔選合併 → 提示「已匯入 0 個項目、0 筆紀錄」，沒有重複。
5. 匯入一個 .txt 或亂改的 JSON → 「不是『上次』的備份檔」。
6. 主題切淺／深／跟隨系統即時生效。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add settings page with backup export, share and import

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: PWA：manifest、icon、Service Worker

**Files:**
- Create: `public/icon.svg`, `public/.nojekyll`, 產生的 `public/pwa-192x192.png`、`public/pwa-512x512.png`、`public/maskable-icon-512x512.png`、`public/apple-touch-icon-180x180.png`、`public/favicon.ico`
- Modify: `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: icon.svg**

`public/icon.svg`（綠底、白色大「次」字）:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#2f8f5b"/>
  <text x="256" y="330" font-family="Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif" font-size="280" font-weight="700" fill="#ffffff" text-anchor="middle">次</text>
</svg>
```

- [ ] **Step 2: 產生 PNG icon（一次性，產物進版控）**

Run:
```bash
npx --yes @vite-pwa/assets-generator@latest --preset minimal-2023 public/icon.svg
ls public
```
Expected: `pwa-64x64.png pwa-192x192.png pwa-512x512.png maskable-icon-512x512.png apple-touch-icon-180x180.png favicon.ico`。這個工具只在開發機跑一次，不進 `package.json`。若機器上 `sharp` 安裝失敗，改用 Chrome 開 `icon.svg` 截圖另存，尺寸照上面。

- [ ] **Step 3: vite.config.ts 加 PWA**

```ts
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/last-time/',
  define: { __APP_VERSION__: JSON.stringify(process.env['npm_package_version'] ?? '0.0.0') },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt', // new SW waits until all tabs close; never reloads mid-use
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
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
        navigateFallback: '/last-time/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: process.env['VITEST'] ? { conditions: ['browser'] } : undefined,
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
```

- [ ] **Step 4: index.html head 補 icon 與 apple 標籤**

在 `<title>` 前加：
```html
<link rel="icon" href="/last-time/favicon.ico" sizes="48x48" />
<link rel="icon" href="/last-time/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/last-time/apple-touch-icon-180x180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

- [ ] **Step 5: main.ts 註冊 SW**

在 `mount(...)` 之前加：
```ts
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
```
不處理 `onNeedRefresh`：新版 SW 會在所有分頁關閉後自動接管，符合「不打斷使用中」。

- [ ] **Step 6: 檢查**

Run: `npm run build && npm run preview`
手動：Chrome 開 `http://localhost:4173/last-time/` → DevTools → Application：Manifest 無錯誤、Service Worker 已啟用、Cache 內含 woff2；勾 Offline 重新整理仍可用；網址列出現「安裝」圖示。Lighthouse PWA 可安裝。

`public/.nojekyll` 內容空檔即可。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add PWA manifest, icons and service worker

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: CI、README、推送

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run check
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README.md**

```markdown
# 上次

記下你上次做某件事的時間，打開就看到過了幾天。長按記一筆，記錯立刻復原。

網址：https://cyril1018.github.io/last-time/

沒有帳號、沒有伺服器、沒有廣告。資料只存在你手機的瀏覽器裡。

## 安裝到手機（Android Chrome）

1. 用 Chrome 打開上面的網址。
2. 右上角選單 → 「加到主畫面」或「安裝應用程式」。
3. 之後從主畫面開啟，沒有網路也能用。

長按主畫面圖示會出現「新增項目」捷徑。

## 備份與還原

- 設定 → 「匯出備份」會下載 `上次備份-YYYY-MM-DD.json`；「分享備份」可以直接傳到雲端硬碟或通訊軟體。
- 換手機或重裝時：設定 → 「匯入備份」→ 選檔 → 「覆蓋現有資料」。
- 「合併到現有資料」只加入沒有的項目和紀錄，重複匯入不會產生重複資料。

## 資料存在哪裡、什麼時候會消失

資料存在瀏覽器的 IndexedDB 和 localStorage。這些情況會讓資料消失，請先匯出備份：

- 清除 Chrome 的「網站資料」或此網站的儲存空間
- 解除安裝 Chrome
- 手機儲存空間嚴重不足時，系統可能清除未安裝到主畫面的網站資料

網站更新只會換程式，不會動到資料。

## 開發

```bash
npm install
npm run dev        # http://localhost:5173/last-time/
npm test           # Vitest
npm run check      # svelte-check
npm run build      # 輸出到 dist/
```

推上 `main` 後 GitHub Actions 會自動測試、打包並部署到 GitHub Pages。

## 授權

程式碼 MIT。字型 [Fraunces](https://github.com/undercasetype/Fraunces) 依 SIL Open Font License 1.1 隨網站打包，授權全文見 `src/assets/fonts/OFL.txt`。
```

- [ ] **Step 3: LICENSE**

建 `LICENSE`（MIT，版權人 `Ted`，年份 2026）。

- [ ] **Step 4: 推送前檢查**

Run:
```bash
npm test && npm run check && npm run build
git log --format='%an <%ae>' | sort -u
git grep -n -i -E 'eri\.com' -- . ':!docs/superpowers/plans/*' || echo clean
```
Expected: 測試全綠；作者只有 `Ted <38046383+cyril1018@users.noreply.github.com>`；grep 輸出 `clean`。

- [ ] **Step 5: Commit 並推送**

```bash
git add -A
git commit -m "Add GitHub Pages deploy workflow, README and license

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin main
```

- [ ] **Step 6: 使用者設定 Pages 來源**

請使用者到 `https://github.com/cyril1018/last-time/settings/pages`，Source 選「GitHub Actions」。然後到 Actions 分頁確認 workflow 綠色，開 `https://cyril1018.github.io/last-time/`。

- [ ] **Step 7: 實機驗收**

依規格 §13 驗收清單在 Android Chrome 上逐項試，把結果回報給使用者。
