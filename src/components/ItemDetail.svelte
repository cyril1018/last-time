<script lang="ts">
  import { store } from '../lib/app-store'
  import { router } from '../lib/router.svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { logAndToast } from '../lib/log-flow'
  import { exclusive } from '../lib/exclusive'
  import { since, sinceParts, isDue, averageIntervalDays, formatIntervalDays } from '../lib/calc'
  import { i18n } from '../lib/i18n/i18n.svelte'
  import Timeline from './Timeline.svelte'

  let { id }: { id: string } = $props()

  const item = $derived(store.itemById(id))
  const records = $derived(store.recordsOf(id))
  const last = $derived(records[0]?.ts)
  const s = $derived(last === undefined ? null : since(last, store.now))
  const parts = $derived(s ? sinceParts(s, i18n.locale) : null)
  const due = $derived(item && s ? isDue(item.expectDays, s) : false)
  const avg = $derived(averageIntervalDays(records.map((r) => r.ts)))

  const logNow = exclusive(() => logAndToast(store.logNow(id)))

  // Item vanished (deleted, or its creation undone) → go home without leaving a duplicate home entry
  $effect(() => { if (store.ready && !item) router.home() })
</script>

{#if item}
  <div class="page">
    <header>
      <button class="icon-btn" aria-label={i18n.t.common.back} onclick={() => router.home()}>‹</button>
      <div class="title">
        <h1><span aria-hidden="true">{item.emoji}</span> {item.name}</h1>
        <p class="muted small">
          {#if item.expectDays}{i18n.t.detail.everyDays(item.expectDays)}{/if}
          {#if item.archived}{item.expectDays ? ' · ' : ''}{i18n.t.detail.archived}{/if}
        </p>
      </div>
      <button class="icon-btn" aria-label={i18n.t.detail.edit} onclick={() => sheets.open({ kind: 'edit-item', itemId: id })}>✎</button>
    </header>

    <section class="summary">
      <div>
        <span class="label muted">{i18n.t.detail.sinceLast}</span>
        <span class="val num-font" class:danger={due}>{parts ? i18n.t.detail.sinceValue(parts.number, parts.unit) : '—'}</span>
      </div>
      <div>
        <span class="label muted">{i18n.t.detail.averageGap}</span>
        <span class="val num-font">{avg === null ? '' : i18n.t.detail.averageValue(formatIntervalDays(avg))}</span>
        {#if avg === null}<span class="muted tiny">{i18n.t.detail.averagePending}</span>{/if}
      </div>
      <div>
        <span class="label muted">{i18n.t.detail.count}</span>
        <span class="val num-font">{records.length}</span>
      </div>
    </section>

    <Timeline {records} onpick={(rid) => sheets.open({ kind: 'edit-record', recordId: rid })} />

    <div class="spacer"></div>
    <footer>
      <button class="btn primary wide" onclick={() => logNow()}>{i18n.t.detail.logNow}</button>
      <button class="btn" onclick={() => sheets.open({ kind: 'backdate', itemId: id })}>{i18n.t.detail.backdate}</button>
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
