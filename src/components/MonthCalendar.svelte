<script lang="ts">
  import { monthGrid } from '../lib/calendar'

  let { year, month0, todayTs, selected, marked, ontoggle }: {
    year: number; month0: number; todayTs: number; selected: Set<string>; marked: Set<string>; ontoggle: (key: string) => void
  } = $props()
  const cells = $derived(monthGrid(year, month0, todayTs))
  const weekdays = ['一', '二', '三', '四', '五', '六', '日']
</script>

<div class="cal">
  {#each weekdays as w (w)}<div class="wd muted">{w}</div>{/each}
  {#each cells as c (c.key)}
    <button type="button" class="cell"
            class:out={!c.inMonth} class:today={c.today} class:sel={selected.has(c.key)}
            disabled={c.future} aria-pressed={selected.has(c.key)} aria-label={c.key}
            onclick={() => ontoggle(c.key)}>
      <span>{c.day}</span>
      {#if marked.has(c.key)}<i class="mark" aria-hidden="true"></i>{/if}
    </button>
  {/each}
</div>

<style>
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .wd { text-align: center; font-size: 0.75rem; padding: 0.25rem 0; }
  .cell { position: relative; aspect-ratio: 1; border: 0; border-radius: 10px; background: transparent; font-size: 0.95rem; display: grid; place-items: center; }
  .cell.out { opacity: 0.35; }
  .cell:disabled { color: var(--muted); opacity: 0.4; }
  .cell.today { box-shadow: inset 0 0 0 2px var(--accent); }
  .cell.sel { background: var(--accent); color: var(--on-accent); }
  .mark { position: absolute; bottom: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
  .cell.sel .mark { background: var(--on-accent); }
</style>
