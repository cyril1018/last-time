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
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    let text: string
    try {
      text = await readFileText(file)
    } catch {
      input.value = ''
      toasts.show('讀取檔案失敗')
      return
    }
    const res = parseBackup(text)
    input.value = ''
    if (!res.ok) { toasts.show('不是『上次』的備份檔'); return }
    sheets.open({ kind: 'import', backup: res.backup })
  }
  async function clearAll() {
    if (!confirm('清除全部資料？所有項目和紀錄會刪除，無法復原。建議先匯出備份。')) return
    try {
      await store.clearAllData()
    } catch {
      toasts.show('清除失敗，請再試一次')
      return
    }
    toasts.show('已清除全部資料')
    router.home()
  }
</script>

<div class="page">
  <header>
    <button class="icon-btn" aria-label="返回" onclick={() => router.home()}>‹</button>
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
