<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { serializeBackup, parseBackup } from '../lib/backup'
  import { formatBackupFileName, formatLong } from '../lib/format'
  import { i18n } from '../lib/i18n/i18n.svelte'
  import { downloadText, shareText, canShareFiles, readFileText } from '../lib/files'
  import type { LanguageSetting, Theme } from '../lib/types'

  const version = __APP_VERSION__
  const archived = $derived(store.items.filter((i) => i.archived))
  let fileInput: HTMLInputElement | undefined = $state()

  function backupText() {
    return serializeBackup(store.items, store.records, store.settings, store.now)
  }
  function exportBackup() {
    downloadText(formatBackupFileName(store.now, i18n.locale), backupText())
    store.updateSettings({ lastBackupAt: store.now, backupSnoozeUntil: null })
    toasts.show(i18n.t.settings.exported)
  }
  async function shareBackup() {
    const outcome = await shareText(formatBackupFileName(store.now, i18n.locale), backupText())
    if (outcome === 'shared') store.updateSettings({ lastBackupAt: store.now, backupSnoozeUntil: null })
    else if (outcome === 'unsupported') toasts.show(i18n.t.settings.shareUnsupported)
    else if (outcome === 'failed') toasts.show(i18n.t.settings.shareFailed)
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
      toasts.show(i18n.t.settings.readFailed)
      return
    }
    const res = parseBackup(text, i18n.t.backup.unnamed)
    input.value = ''
    if (!res.ok) { toasts.show(i18n.t.settings.notBackup); return }
    sheets.open({ kind: 'import', backup: res.backup })
  }
  async function unarchive(id: string) {
    try {
      await store.updateItem(id, { archived: false })
    } catch {
      toasts.show(i18n.t.common.saveFailed)
    }
  }
  async function clearAll() {
    if (!confirm(i18n.t.settings.confirmClear)) return
    try {
      await store.clearAllData()
    } catch {
      toasts.show(i18n.t.settings.clearFailed)
      return
    }
    toasts.show(i18n.t.settings.cleared)
    router.home()
  }
</script>

<div class="page">
  <header>
    <button class="icon-btn" aria-label={i18n.t.common.back} onclick={() => router.home()}>‹</button>
    <h1>{i18n.t.settings.title}</h1>
  </header>

  <section>
    <h2>{i18n.t.settings.backup}</h2>
    <p class="muted small">{i18n.t.settings.lastBackup(store.settings.lastBackupAt === null ? i18n.t.settings.never : formatLong(store.settings.lastBackupAt, i18n.dateLocale))}</p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>{i18n.t.settings.export}</button>
      {#if canShareFiles()}<button class="btn" onclick={shareBackup}>{i18n.t.settings.share}</button>{/if}
      <button class="btn" onclick={() => fileInput?.click()}>{i18n.t.settings.import}</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" class="sr-only" onchange={onFile} />
    </div>
  </section>

  <section>
    <h2>{i18n.t.settings.appearance}</h2>
    <!-- Fixed bilingual on purpose: whoever lands in the wrong language can still find the way back. -->
    <label class="field"><span>語言 / Language</span>
      <select value={store.settings.language} onchange={(e) => store.updateSettings({ language: (e.target as HTMLSelectElement).value as LanguageSetting })}>
        <option value="system">跟隨系統 / System</option><option value="zh-TW">繁體中文</option><option value="en">English</option>
      </select>
    </label>
    <label class="field"><span>{i18n.t.settings.theme}</span>
      <select value={store.settings.theme} onchange={(e) => store.updateSettings({ theme: (e.target as HTMLSelectElement).value as Theme })}>
        <option value="system">{i18n.t.settings.themeSystem}</option><option value="light">{i18n.t.settings.themeLight}</option><option value="dark">{i18n.t.settings.themeDark}</option>
      </select>
    </label>
    <label class="toggle"><input type="checkbox" checked={store.settings.vibrate} onchange={(e) => store.updateSettings({ vibrate: (e.target as HTMLInputElement).checked })} /> {i18n.t.settings.vibrate}</label>
  </section>

  <section>
    <h2>{i18n.t.settings.organize}</h2>
    {#if archived.length === 0}
      <p class="muted small">{i18n.t.settings.noArchived}</p>
    {:else}
      <ul class="plain">
        {#each archived as a (a.id)}
          <li><span>{a.emoji} {a.name}</span><button class="btn" onclick={() => unarchive(a.id)}>{i18n.t.settings.unarchive}</button></li>
        {/each}
      </ul>
    {/if}
    <button class="btn danger" onclick={clearAll}>{i18n.t.settings.clearAll}</button>
  </section>

  <section>
    <h2>{i18n.t.settings.about}</h2>
    <p class="muted small">{i18n.t.settings.stats(version, store.items.length, store.records.length)}</p>
    <p class="muted small">{i18n.t.settings.privacy}</p>
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
