<script lang="ts">
  import { store } from '../lib/app-store'
  import { i18n } from '../lib/i18n/i18n.svelte'
  import { router } from '../lib/router.svelte'
  import { recent7, backupBannerVisible, DAY_MS } from '../lib/calc'
  import { homeView } from '../lib/home-view'
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

  const stats = $derived(recent7(store.items, store.lastTs, store.now))
  const view = $derived(homeView(store.items, store.lastTs, query))
  const showBanner = $derived(backupBannerVisible(store.records.length, store.settings, store.now))

  let searchBar: ReturnType<typeof SearchBar> | undefined = $state()

  let flashId = $state<string | null>(null)
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  function flash(id: string) {
    clearTimeout(flashTimer)
    flashId = id
    flashTimer = setTimeout(() => { flashId = null }, 700)
  }
  $effect(() => () => clearTimeout(flashTimer))

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
      const name = view.query
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
    <h1>{i18n.t.app.name}</h1>
    <div class="stats" aria-label={i18n.t.home.statsLabel(stats.done, stats.total)}>
      <span class="num-font big">{stats.done} / {stats.total}</span>
      <span class="muted small">{i18n.t.home.statsCaption}</span>
    </div>
    <button class="icon-btn" aria-label={i18n.t.home.settings} onclick={() => router.navigate({ name: 'settings' })}>⚙︎</button>
  </header>

  {#if showBanner}
    <BackupBanner onlater={() => store.updateSettings({ backupSnoozeUntil: store.now + 7 * DAY_MS })} />
  {/if}

  {#if view.empty}
    <EmptyState onpick={(t) => { query = t; searchBar?.focus() }}
                note={view.archivedCount > 0 ? i18n.t.home.archivedNote(view.archivedCount) : undefined} />
  {:else}
    <ul class="list">
      {#if view.showAdd}
        <li class="add">
          <button onclick={submit}>{view.addLabelKind === 'restore' ? i18n.t.home.addRestore(view.query) : i18n.t.home.addNew(view.query)}</button>
        </li>
      {/if}
      {#each view.visible as item (item.id)}
        <ItemRow {item} lastTs={store.lastTs.get(item.id)} now={store.now} flash={flashId === item.id}
                 onopen={() => router.navigate({ name: 'item', id: item.id })}
                 onlog={() => logItem(item.id)} />
      {/each}
    </ul>
    <p class="hint muted small">{i18n.t.home.hint}</p>
  {/if}

  <div class="spacer"></div>
  <SearchBar bind:this={searchBar} bind:value={query} onsubmit={submit} autofocus={wantFocus} />
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
