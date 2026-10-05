<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sortItemsForHome, recent7, backupBannerVisible, normalizeName, DAY_MS } from '../lib/calc'
  import { logAndToast } from '../lib/log-flow'
  import { exclusive } from '../lib/exclusive'
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

  // One guard for both entry points: a double tap (or tap + Enter) never logs twice.
  const guarded = exclusive((task: () => Promise<void>) => task())

  function logItem(id: string) {
    return guarded(async () => {
      const r = await logAndToast(store.logNow(id))
      if (r) flash(id)
    })
  }

  function submit() {
    return guarded(async () => {
      const name = q
      if (!name) return
      // Clear right away so the add row disappears before the write lands; put the text back if it fails.
      const typed = query
      query = ''
      const r = await logAndToast(store.addItemAndLog(name))
      if (r) flash(r.item.id)
      else if (!query) query = typed
    })
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
      {#if q && (!exact || exact.archived)}
        <li class="add">
          <button onclick={submit}>{exact?.archived ? `＋ 恢復『${q}』，以現在的時間記一筆` : `＋ 新增『${q}』，以現在的時間記下第一筆`}</button>
        </li>
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
  .add { list-style: none; }
  .add button { width: 100%; text-align: left; border: 0; background: var(--accent-soft); color: var(--accent); padding: 0.9rem 1rem; font-weight: 600; }
  .hint { text-align: center; margin: 1rem 0; }
  .spacer { flex: 1; }
</style>
