# 上次

記下你上次做某件事的時間，打開就看到過了幾天。長按記一筆，記錯立刻復原。

介面有繁體中文和英文，會跟著手機語言切換，也可以在設定裡手動選。

網址：https://cyril1018.github.io/last-time/

沒有帳號、沒有伺服器、沒有廣告。資料只存在你手機的瀏覽器裡。

## 安裝到手機（Android Chrome）

1. 用 Chrome 打開上面的網址。
2. 右上角選單 → 「加到主畫面」或「安裝應用程式」。
3. 之後從主畫面開啟，沒有網路也能用。

長按主畫面圖示會出現「新增項目」捷徑。

## 備份與還原

- 設定 → 「匯出備份」會下載 `上次備份-YYYY-MM-DD.json`；「分享備份」（裝置支援時）可以直接傳到雲端硬碟或通訊軟體。
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

## English

**Last Time** tracks how many days it has been since you last did something: take meds, change the water filter, call your parents. Press and hold an item to log it; undo is one tap away.

Website: https://cyril1018.github.io/last-time/

No account, no server, no ads. Your data stays in your phone's browser. The interface is in English or Traditional Chinese, following your phone's language; you can change it in Settings.

### Install on Android (Chrome)

1. Open the website in Chrome.
2. Menu → "Add to Home screen" or "Install app".
3. It then opens from your home screen and works offline.

Press and hold the home screen icon for an "Add item" shortcut.

### Backup and restore

- Settings → "Export backup" downloads `last-time-backup-YYYY-MM-DD.json`. "Share backup" (where supported) sends it straight to cloud storage or a chat app.
- On a new phone: Settings → "Import backup" → pick the file → "Replace current data".
- "Merge into current data" only adds items and entries you don't have yet, so importing twice never duplicates anything.

### Where your data lives

Data is stored in the browser's IndexedDB and localStorage. It is erased if you clear Chrome's site data for this site, uninstall Chrome, or (for a site not added to the home screen) the phone runs very low on storage. Export a backup first. Updating the site only replaces the app, never your data.

## 授權

程式碼 MIT。字型 [Fraunces](https://github.com/undercasetype/Fraunces) 依 SIL Open Font License 1.1 隨網站打包，授權全文見 `src/assets/fonts/OFL.txt`。

Code: MIT. The Fraunces font ships under the SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
