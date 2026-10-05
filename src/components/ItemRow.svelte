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
