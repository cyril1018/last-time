# 「上次」英文介面與推廣 設計規格

日期：2026-10-14
狀態：待使用者確認

## 0. 背景與目標

使用者想推廣「上次」，讓英文使用者也能用。這份規格涵蓋四件事：

1. 英文介面（中英兩種語言，自動跟手機語言，設定可手動切換）
2. 自動配 emoji 支援英文名稱
3. 編輯項目時的「更多 emoji」
4. 搜尋和分享用的描述：`index.html` 的 meta、README、GitHub repo 的 About 欄位

本文件和 `2026-10-05-last-time-web-design.md`（下稱「原規格」）衝突的地方以本文件為準。被取代的段落：原規格 §4.3（猜 emoji）、§5（設定）、§9 的 Manifest 一項、§14 的 README 內容。

## 1. 範圍

要做：

- 介面所有使用者看得到的文字都有中英兩版，包括 `aria-label`、`placeholder`、`confirm()` 對話框、toast、空狀態範例、各畫面的 `<h1>` 和抽屜標題。瀏覽器分頁標題 `<title>` 例外，固定中英並列（§2.4）。
- 日期、時間、「距上次」的數字單位依語言格式化。
- 英文的 PWA manifest（安裝名稱 Last Time）。
- 自動配 emoji 加上英文關鍵字；「洗」改配 🧼。
- 編輯項目的「更多 emoji」分類面板。
- `index.html` 的 SEO 與 Open Graph、雙語 README、repo About。

不做：

- 第三種語言，包括簡體中文。
- 翻譯使用者自己輸入的項目名稱和備註。
- 英文版獨立網址（`/en/`）與 hreflang。
- 月曆依地區改成星期日開始，中英文都從星期一開始。
- 備份檔格式變更，`version` 維持 1，語言設定不進備份。
- 任何多語系套件。

## 2. 語言判斷與儲存

### 2.1 型別與設定

```ts
type Locale = 'zh-TW' | 'en'
type LanguageSetting = 'system' | Locale
```

`Settings` 新增 `language: LanguageSetting`，預設 `'system'`。`loadSettings` 照 `theme` 的方式驗證，不合法的值（包含舊使用者沒有這個欄位）一律退回 `'system'`。

原規格 §5 的設定表加一列：

| 鍵 | 值 | 預設 |
| --- | --- | --- |
| language | `system` / `zh-TW` / `en` | system |

「清除全部資料」保留 `theme`、`vibrate`、`language` 三個設定（`store.clearAllData`）。匯入備份「覆蓋」時只套用備份裡的主題和震動，不動語言。

### 2.2 解析規則

純函式 `resolveLocale(setting, languages: readonly string[]): Locale`，放在 `src/lib/i18n/locale.ts`：

- `setting` 不是 `'system'` 就直接用它。
- 否則看 `languages[0]`（呼叫端傳 `navigator.languages`）：不分大小寫，以 `zh` 開頭就是 `'zh-TW'`，其他（包含空陣列）都是 `'en'`。

所以 `zh-TW`、`zh-HK`、`zh-CN` 都顯示繁體中文。

另外 `dateLocale(locale, languages): string` 決定日期格式用的語言標籤：

- `'zh-TW'` → `'zh-TW'`
- `'en'` → `languages` 裡第一個以 `en` 開頭的標籤（例如 `en-GB`），沒有就用 `'en-US'`

### 2.3 響應式狀態

`src/lib/i18n/i18n.svelte.ts` 匯出 `i18n`，提供：

- `i18n.locale`：由 `store.settings.language` 和目前的 `navigator.languages` 算出。
- `i18n.t`：目前語言的翻譯表。
- `i18n.dateLocale`：見 §2.2。

`navigator.languages` 存在一個 `$state` 裡，監聽 `window` 的 `languagechange` 事件更新。設定或系統語言一變，所有用到 `i18n.t` 的畫面立刻重繪，不重新整理。

`App.svelte` 用 `$effect` 把 `document.documentElement.lang` 設成 `'zh-Hant-TW'` 或 `'en'`，並把 manifest 連結指到對應的檔案（§6），寫法跟現在的主題 effect 相同。

### 2.4 首次繪製前

`index.html` 裡現有的主題啟動小程式一併處理語言：讀 `lasttime.settings` 的 `language`，用和 §2.2 相同的規則決定語言，設好 `<html lang>`。這段程式和 `resolveLocale` 必須保持一致，測試會驗證兩者在同一組輸入下結果相同。localStorage 讀不到或格式錯誤時照常不拋錯，當成 `'system'`。

這段程式不改 manifest 連結：vite-plugin-pwa 注入的 `<link rel="manifest">` 位於這段程式之後，執行當下還不存在。manifest 改由 §2.3 的 `App.svelte` 處理。

分頁標題 `<title>` 不在執行期改動，維持 §7.1 的中英並列。原因是 Google 會執行 JavaScript，若改成單一語言，搜尋結果可能只出現「Last Time」。安裝成 App 後，Android 顯示的是 manifest 的名稱，不受影響。

### 2.5 設定頁

設定頁新增一個下拉選單，放在主題上方：

- 標題固定寫「語言 / Language」，不跟著介面語言變。
- 選項固定是「跟隨系統 / System」「繁體中文」「English」。

這樣不管目前是哪個語言，都找得到切回去的地方。

## 3. 翻譯表與格式化

### 3.1 檔案

```
src/lib/i18n/
  locale.ts        Locale 型別、resolveLocale、dateLocale（純函式）
  zh-TW.ts         中文翻譯表（原文）
  en.ts            英文翻譯表，型別為 Messages
  messages.ts      export type Messages = typeof zhTW；依 Locale 取表
  i18n.svelte.ts   響應式的 i18n 物件
```

- 翻譯表依畫面分組，例如 `home`、`detail`、`editItem`、`settings`、`import`、`toast`、`errors`、`emojiCategories`。
- 帶參數的句子寫成函式，例如 `archivedNote: (n: number) => string`。
- `en.ts` 宣告為 `Messages`，少一個鍵、多一個鍵或型別不同都無法通過 `npm run check`。
- 英文的單複數在函式內以 `n === 1` 判斷。

### 3.2 用語對照

英文用語要前後一致：

| 中文 | 英文 |
| --- | --- |
| 上次（App 名稱） | Last Time |
| 項目 | item |
| 紀錄 | entry |
| 記一筆 / 立即記錄 | Log / Log now |
| 補其他日期 | Log a past date |
| 復原 | Undo |
| 備註 | Note |
| 封存 / 已封存 | Archive / Archived |
| 距上次 | Since last |
| 平均間隔 | Average gap |
| 共幾次 | Times |
| 大概每 N 天一次 | About every N days |
| 該做了 | Due |
| 最近 7 天做過 | Done in the last 7 days |
| 尚未記錄 | Not logged yet |
| 同一天 / 空缺 N 天 | Same day / N-day gap |
| 點一下看細節，長按直接記一筆 | Tap for details. Press and hold to log. |
| 匯出備份 / 分享備份 / 匯入備份 | Export backup / Share backup / Import backup |
| 合併到現有資料 / 覆蓋現有資料 | Merge into current data / Replace current data |
| 搜尋或新增一件事 | Search or add something |
| 未命名 | Untitled |

空狀態的範例詞（點了會帶入搜尋框）英文版：`Take meds`、`Change water filter`、`Replace gas tank`、`Go running`、`Haircut`、`Pay bills`。

### 3.3 純函式改為接收語言

以下函式現在直接回傳中文，改成多收一個必填參數，由呼叫端從 `i18n` 傳入。函式內不讀全域狀態：

| 函式 | 新參數 |
| --- | --- |
| `sinceParts(s, locale)` | `Locale` |
| `formatMonthDay` / `formatShort` / `formatLong`（`ts, dateLocale`） | `string` |
| `monthLabel(year, month0, dateLocale)`（`calendar.ts`） | `string` |
| `errorMessage(e, locale)` | `Locale` |
| `formatBackupFileName(now, locale)` | `Locale` |

- 新增 `formatClock(ts, dateLocale)`：畫面上顯示的時分。中文就是 `formatTime` 的結果（`14:30`），英文用 `Intl`。
- `formatTime` 本身維持固定 24 小時制，因為 `toDatetimeLocalValue` 需要這個格式；它不再直接用在畫面上。
- `toDateKey`、`toDatetimeLocalValue`、`fromDatetimeLocalValue` 不變。
- `log-flow.ts` 本來就直接使用全域的 `store` 和 `toasts`，所以直接讀 `i18n`，不改成傳參數。
- 參數是必填，不給預設值，避免呼叫端忘了傳而默默顯示中文。
- 既有測試的呼叫要補上 `'zh-TW'`，但預期輸出一字不改，以此證明中文行為沒變。
- `backup.ts` 的 `UNNAMED_ITEM` 改由呼叫端傳入目前語言的「未命名 / Untitled」。
- `ImportSheet.svelte` 的 `toLocaleString('zh-TW')` 改用 `i18n.dateLocale`。

### 3.4 日期與時間

中文完全維持現狀：

- `formatMonthDay`：`10月14日`
- `formatShort`：`10月14日 14:30`
- `formatLong`：`2026年10月14日 週三 14:30`
- `monthLabel`：`2026 年 10 月`

英文一律用 `Intl.DateTimeFormat(dateLocale, …)`，以 `en-US` 為例：

- `formatMonthDay`：`Oct 14`
- `formatShort`：`Oct 14, 2:30 PM`
- `formatLong`：`Wed, Oct 14, 2026, 2:30 PM`
- `monthLabel`：`October 2026`

12 或 24 小時制跟著 `dateLocale` 的慣例（`en-GB` 是 `14:30`）。toast「已記錄 … 14:30」英文為 `Logged {emoji} {name} at {time}`，`{time}` 來自 `formatClock`。

### 3.5 「距上次」

| 情況 | 中文（不變） | 英文 |
| --- | --- | --- |
| 一小時內 | `剛剛` | `now` |
| 幾小時 | `3` `小時` | `3` `hr` |
| 幾天 | `5` `天` | `5` `days`；1 天為 `1` `day` |

數字和單位仍分開回傳（`{ number, unit }`），字級規則（`numberStyle`）不變。

### 3.6 月曆

- 星期標題：中文 `一 二 三 四 五 六 日` 不變，英文為 `M T W T F S S`。
- 每個日期格的 `aria-label` 英文為 `2026-10-14, has entries`。
- 一週從星期一開始，中英文相同（`calendar.ts` 不改）。

### 3.7 不重翻的東西

已經顯示的 toast 不因切換語言而重翻，下一則才是新語言。

## 4. 自動配 emoji

### 4.1 結構

`EMOJI_RULES` 改成每條規則同時帶中英文關鍵字，共用同一個順序（先命中先贏）：

```ts
interface EmojiRule { zh: readonly string[]; en: readonly string[]; emoji: string }
```

不論介面語言，兩種關鍵字都會比對。

### 4.2 比對方式

- 中文：維持「名稱包含關鍵字」（`name.includes(k)`）。
- 英文：
  - 名稱和關鍵字都轉小寫。
  - 關鍵字前後必須是字串開頭、結尾，或不是 `a-z0-9` 的字元。也就是以完整單字比對，可以是片語，例如 `air conditioner`。
  - 關鍵字後面可以接 `s`、`es`、`ed`、`ing`。
  - 所以 `Water plants` 命中 `plant`，`card` 不會命中 `car`，`haircut` 不會命中 `cut`。
  - 需要重複字尾子音的形式（例如 `running`、`jogging`）直接列進關鍵字。
- 同一條規則先比中文再比英文，任一命中即採用。

### 4.3 規則表

取代原規格 §4.3。中文關鍵字與順序不變，只有第 18 條的 emoji 由 🫧 改成 🧼（舊手機顯示不出 Unicode 14 的 🫧）。已建立的項目不受影響。

| 順序 | 中文 | 英文 | emoji |
| --- | --- | --- | --- |
| 1 | 床單、棉被、枕、床 | bed, bedding, sheet, pillow, duvet, blanket | 🛏️ |
| 2 | 電話、爸、媽 | call, phone, mom, mum, dad, parent, grandma, grandpa | 📞 |
| 3 | 剪 | cut, trim, clip, nail | ✂️ |
| 4 | 頭髮 | haircut, hair, barber | 💇 |
| 5 | 澆、盆栽、植 | plant, garden, repot, succulent | 🪴 |
| 6 | 花 | flower | 🌸 |
| 7 | 濾 | filter | 💧 |
| 8 | 洗車、車 | car, vehicle | 🚗 |
| 9 | 加油 | fuel, refuel, petrol, gas station, fill up | ⛽ |
| 10 | 跑 | run, running, jog, jogging | 🏃 |
| 11 | 健身 | gym, workout, weights | 🏋️ |
| 12 | 游泳 | swim, swimming | 🏊 |
| 13 | 牙 | teeth, tooth, dentist, floss | 🦷 |
| 14 | 醫、健檢 | doctor, checkup, check-up, clinic, hospital | 🩺 |
| 15 | 藥 | medicine, meds, medication, pill, vitamin | 💊 |
| 16 | 垃圾 | trash, garbage, rubbish, recycling, bin | 🗑️ |
| 17 | 掃、拖 | sweep, mop, vacuum, clean | 🧹 |
| 18 | 洗 | wash, laundry | 🧼 |
| 19 | 貓 | cat, kitten, litter | 🐱 |
| 20 | 狗 | dog, puppy | 🐶 |
| 21 | 魚 | fish, aquarium | 🐟 |
| 22 | 冷氣 | ac, aircon, air con, air conditioner | ❄️ |
| 23 | 書 | book, read, library | 📚 |
| 24 | 電影 | movie, film, cinema | 🎬 |
| 25 | 旅 | travel, trip, flight, vacation, holiday | ✈️ |
| 26 | 按摩 | massage, spa | 💆 |
| 27 | 繳 | pay, paid, bill, invoice, tax, fee | 🧾 |
| 28 | 電池 | battery, batteries, charge | 🔋 |
| 29 | 燈 | light, bulb, lamp | 💡 |
| 30 | 朋友、聚 | friend, meet, catch up, party, hangout | 🍻 |
| 31 | 吃 | eat, dinner, lunch, restaurant | 🍜 |
| 32 | 冰箱 | fridge, refrigerator, freezer | 🧊 |
| 33 | 窗 | window | 🪟 |
| 34 | 修 | fix, repair, maintenance, service | 🔧 |
| 35 | 瓦斯 | gas tank, gas cylinder, propane, stove | 🔥 |
| 36 | 轉帳、匯款、帳戶 | transfer, rent, deposit, bank account, savings | 💸 |
| 37 | 換 | change, replace, swap, renew | 🔄 |
| — | 都不符合 | 都不符合 | 📌 |

英文刻意不收單獨的 `water`（`water filter` 會被第 5 條搶走）和單獨的 `gas`（美式指汽油、也可能指瓦斯，意思不明確）。

## 5. 更多 emoji

### 5.1 資料

`src/lib/emoji.ts`：

- `QUICK_EMOJIS` 維持 20 個，🫧 換成 🧼：
  `📌 🛏️ 📞 💊 💧 🔥 💸 🧹 🧼 🚗 🏃 🦷 🩺 🗑️ 🪴 🍜 🧾 🔋 💡 🔧`
- 新增 `EMOJI_CATEGORIES: ReadonlyArray<{ id: EmojiCategoryId; emojis: readonly string[] }>`，分類名稱放在翻譯表的 `emojiCategories[id]`。
- 分類是完整的 emoji 目錄。常用清單是放在最前面的捷徑，兩邊可以重複。
- 只收 Unicode 13.0 以前的 emoji。

| id | 中文 | 英文 | emoji |
| --- | --- | --- | --- |
| chores | 家務 | Chores | 🧹 🧺 🧼 🧽 🗑️ ♻️ 🛏️ 🪟 🧊 🍳 🍽️ 🚿 🛁 🚽 |
| care | 個人保養 | Personal care | ✂️ 💇 💈 🪒 🦷 💅 🧴 👕 👟 |
| health | 健康 | Health | 🩺 💊 💉 🩹 🌡️ 👓 😴 🧘 |
| exercise | 運動 | Exercise | 🏃 🚶 🏋️ 🏊 🚴 ⚽ 🏀 🎾 🧗 |
| living | 寵物與植物 | Pets & plants | 🐱 🐶 🐟 🐦 🐢 🪴 🌸 🌱 🌵 |
| transport | 交通 | Getting around | 🚗 ⛽ 🛵 🚲 🔧 🅿️ ✈️ 🧳 |
| money | 帳單與錢 | Bills & money | 🧾 💸 💳 🏦 💰 📮 📅 |
| home | 生活用品 | Around the house | 📌 🔋 💡 💧 🔥 ❄️ 🔌 🧯 🔑 📦 🔄 |
| social | 社交與休閒 | Social & leisure | 📞 🍻 🍜 ☕ 🎂 🎁 📚 🎬 🎮 🎵 💆 📷 |

共 87 個。

### 5.2 介面（`EditItemSheet.svelte`）

- 常用清單最後多一格「⋯」按鈕，樣式和其他格相同。
  - `aria-label`：「更多圖示 / More icons」
  - `aria-expanded`：反映展開狀態
  - `aria-controls`：指向分類面板
- 點了在常用清單下方展開分類面板：每個分類一個小標題，以 `role="group"` 加上分類名稱的 `aria-label` 包住，按鈕樣式與常用清單相同。目前選中的 emoji 以 `.on` 標示，常用清單和分類面板裡都會標示。
- 點分類裡任一 emoji：設為圖示、收起面板、焦點移回「⋯」。再點一次「⋯」也會收起。
- 展開狀態不存進草稿，重開編輯畫面一律收起。
- 收起時面板不渲染，F4 的 Tab 循環本來就會略過它。
- 「圖示」文字欄可自由輸入的功能不變。

## 6. PWA manifest

- 中文 manifest 維持 vite-plugin-pwa 產生的 `manifest.webmanifest`：名稱「上次」，捷徑「新增項目」。
- `vite.config.ts` 加一個小插件，在 `generateBundle` 由同一份 `pwaOptions.manifest` 產生 `manifest-en.webmanifest`，只覆寫以下欄位：

| 欄位 | 英文值 |
| --- | --- |
| `name` / `short_name` | `Last Time` |
| `description` | `Track how many days since you last did something.` |
| `lang` | `en` |
| `shortcuts[0].name` / `short_name` | `Add item` / `Add` |

- `id`、`start_url`、`scope`、圖示、顏色、捷徑網址都與中文版相同，讓 Chrome 視為同一個 App。
- 英文 manifest 要在 Service Worker 的預先快取清單裡，離線時也拿得到。
- `App.svelte` 依 `i18n.locale` 把 `<link rel="manifest">` 的 `href` 換成 `manifest.webmanifest` 或 `manifest-en.webmanifest`（以 `base` 為前綴）。

**已知限制**：主畫面圖示的名稱在安裝當下決定。之後在 App 裡切換語言，圖示名稱是否跟著改，取決於 Chrome 何時更新已安裝的 App，不在本規格保證範圍。實機驗收時記錄實際行為。

## 7. 搜尋、分享與 repo 頁面

### 7.1 `index.html`

固定內容，不在執行期改動：

- `<title>上次 Last Time — 記下上次做某件事過了幾天</title>`
- `<meta name="description">`：`記下你上次做某件事的時間，打開就看到過了幾天。長按記一筆，可離線使用，免帳號，資料只存在你的手機。Track how many days since you last did something — offline, no account, your data stays on your phone.`
- Open Graph：
  - `og:type` = `website`
  - `og:site_name` = `上次 Last Time`
  - `og:title`：同 `<title>`
  - `og:description`：同 meta description
  - `og:url` = `https://cyril1018.github.io/last-time/`
  - `og:image` = `https://cyril1018.github.io/last-time/pwa-512x512.png`
  - `og:locale` = `zh_TW`，`og:locale:alternate` = `en_US`
- `twitter:card` = `summary`

爬蟲只認絕對網址，所以這裡直接寫出部署網址，並加註解說明原因。`<html lang>` 的預設值維持 `zh-Hant-TW`，由 §2.4 在執行期改寫。

Google 的爬蟲會執行 JavaScript，而且瀏覽器語言是英文，所以會收錄英文介面；搜尋結果的標題和描述則取自上面的固定內容。

### 7.2 README

- 現有中文內容維持在上方，第一段加上「中英文介面」的說明。
- 授權段落之前加一段 `## English`，內容：用途一句話、安裝到 Android、備份與還原、資料存在哪裡。開發指令段落不重複翻譯。
- 撤掉目前工作區未 commit 的那行「The interface is in Traditional Chinese」。

### 7.3 GitHub repo About

英文版部署上線後才改，執行前要再跟使用者確認一次是否用 Git Credential Manager 中 `cyril1018` 的登入資訊呼叫 GitHub API。

- Description：`上次 Last Time — 記下上次做某件事的時間，打開就看到過了幾天。Track how many days since you last did something. Offline PWA, no account, data stays on your phone. 繁體中文 / English.`
- Website：`https://cyril1018.github.io/last-time/`
- Topics（20 個）：`last-time` `days-since` `habit-tracker` `chore-tracker` `reminder` `lifelog` `pwa` `offline-first` `local-first` `privacy` `android` `svelte` `svelte5` `typescript` `vite` `indexeddb` `dexie` `i18n` `zh-tw` `traditional-chinese`

## 8. 測試

每個階段都要通過 `npm test`、`npm run check`、`npm run build`。

### 8.1 語言

- `resolveLocale`：`zh-TW`、`zh-HK`、`zh-CN`、`ZH` → `'zh-TW'`；`en-US`、`ja`、`fr`、空陣列 → `'en'`；手動設定優先於系統語言。
- `dateLocale`：`['en-GB']` → `en-GB`；`['zh-TW', 'en-AU']` 搭配 `'en'` → `en-AU`；`['ja']` 搭配 `'en'` → `en-US`。
- `loadSettings`：`language` 缺少或不合法 → `'system'`；合法值照用。
- `clearAllData` 後 `language` 保留。
- 匯入備份「覆蓋」後 `language` 不變。

### 8.2 翻譯完整度

- 型別：`en.ts` 宣告為 `Messages`，由 `npm run check` 把關。
- 英文翻譯表遞迴取出所有字串（函式以代表性參數呼叫）後，不得含有中日韓文字（`\p{Script=Han}`）。
- 寫死中文的掃描：讀取 `src/components/**/*.svelte` 和 `src/lib/**/*.ts`，移除 `//`、`/* */`、`<!-- -->` 註解後不得含有漢字。例外清單寫在測試裡，每個都附理由：
  - `src/lib/i18n/zh-TW.ts`：中文原文
  - `src/lib/emoji.ts`：中文關鍵字
  - `src/lib/format.ts`：中文日期格式
  - `src/lib/calendar.ts`：`monthLabel` 的中文格式
  - `src/components/Settings.svelte` 中固定的「語言 / Language」「跟隨系統 / System」「繁體中文」：以精確字串列入例外，不例外整個檔案

### 8.3 格式化

- 中文：既有測試只在呼叫處補上 `'zh-TW'`，預期值不變。
- 英文：`formatClock` 在 `en-US` 為 `2:30 PM`、在 `en-GB` 為 `14:30`；`sinceParts` 的 `now` / `1 day` / `3 days` / `3 hr`；`formatShort` 在 `en-US` 是 12 小時制、在 `en-GB` 是 24 小時制；`formatLong`；`monthLabel`；`errorMessage` 每種錯誤；`formatBackupFileName` 為 `last-time-backup-YYYY-MM-DD.json`；`times` 的單複數。
- 匯入沒有名稱的項目：中文得到「未命名」，英文得到「Untitled」。

### 8.4 emoji

- 英文比對：`Water plants` → 🪴、`Haircut` → 💇、`wash car` → 🚗、`card` → 📌、`CAT FOOD` → 🐱、`Change water filter` → 💧、`running` → 🏃、`Pay rent` → 🧾（第 27 條在第 36 條之前）、`air conditioner filter` → 💧（第 7 條在第 22 條之前）。
- 中文：`洗衣服` → 🧼；其餘既有測試不變（🫧 的預期改為 🧼）。
- 常用清單和每條規則的 emoji 都出現在某個分類裡。
- 每個分類內沒有重複；每個分類 id 在中英文翻譯表都有名稱。

### 8.5 啟動程式與建置

- 擴充 `theme-boot.test.ts`：依 `language` 設定與 `navigator.languages` 設好 `<html lang>`；localStorage 壞掉時不拋錯。另外以同一組輸入比對它和 `resolveLocale` 的結果。
- 擴充 `vite-config.test.ts`：英文 manifest 的 `id`、`start_url`、圖示、捷徑網址與中文版相同，`name` 為 `Last Time`。
- 建置後 `dist/manifest-en.webmanifest` 存在，且列在 Service Worker 的預先快取清單裡。

### 8.6 元件

- 設定頁切換語言，畫面文字立刻改變，`<html lang>` 跟著變。
- 「⋯」：`aria-expanded` 正確；選一個 emoji 後圖示欄更新、面板收起、焦點在「⋯」。

## 9. 驗收清單（Android Chrome 實機）

- [ ] 手機語言為英文時，第一次開啟就是英文，不會先閃中文
- [ ] 設定中英文來回切換，畫面立刻改變；選「跟隨系統」後回到手機語言
- [ ] 360 px 寬、系統字體 130% 時，英文版沒有撐破或被截斷的文字
- [ ] 英文狀態下安裝：圖示名稱為 Last Time，長按圖示的捷徑為 Add item
- [ ] 安裝後切換成中文，記錄主畫面圖示名稱是否改變（§6 已知限制）
- [ ] 飛航模式下英文介面一切正常
- [ ] 網址貼到 LINE，出現預覽卡片
- [ ] 「更多」裡的 emoji 都顯示得出來，沒有空白方框；有舊手機時也看一次
- [ ] 中文介面與改版前完全相同（除了 🧼 和「⋯」）
