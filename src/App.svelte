<script lang="ts">
  import { store } from './lib/app-store'
  import { router } from './lib/router.svelte'
  import { sheets } from './lib/sheet.svelte'
  import Toast from './components/Toast.svelte'
  import Home from './components/Home.svelte'
  import ItemDetail from './components/ItemDetail.svelte'
  import EditItemSheet from './components/EditItemSheet.svelte'
  import EditRecordSheet from './components/EditRecordSheet.svelte'

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
    <Home />
  {:else if router.route.name === 'item'}
    <ItemDetail id={router.route.id} />
  {:else}
    <p class="page">設定（Task 15）</p>
  {/if}
{/if}

{#if sheets.current?.kind === 'edit-item'}
  {#key sheets.current.itemId}<EditItemSheet itemId={sheets.current.itemId} />{/key}
{:else if sheets.current?.kind === 'edit-record'}
  {#key sheets.current.recordId}<EditRecordSheet recordId={sheets.current.recordId} />{/key}
{/if}
<!-- Task 14–15 continue the chain with the remaining sheet kinds -->


<Toast />
