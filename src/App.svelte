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
