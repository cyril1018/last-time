<script lang="ts">
  import type { ItemRecord } from '../lib/types'
  import { gapsBetween } from '../lib/calc'
  import { formatLong } from '../lib/format'

  let { records, onpick }: { records: ItemRecord[]; onpick: (recordId: string) => void } = $props()
  const gaps = $derived(gapsBetween(records.map((r) => r.ts)))
</script>

<ol class="timeline">
  {#each records as r, i (r.id)}
    <li>
      <button class="entry" onclick={() => onpick(r.id)}>
        <span class="dot" aria-hidden="true"></span>
        <span class="when">{formatLong(r.ts)}</span>
        {#if r.note}<span class="note muted">{r.note}</span>{/if}
      </button>
      {#if i < records.length - 1}
        <div class="gap muted small">{gaps[i] === 0 ? '同一天' : `空缺 ${gaps[i]} 天`}</div>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .timeline { list-style: none; margin: 0; padding: 0 1rem; }
  .entry { display: grid; grid-template-columns: 1rem 1fr; column-gap: 0.75rem; width: 100%; text-align: left; border: 0; background: transparent; padding: 0.75rem 0; }
  .dot { width: 0.6rem; height: 0.6rem; margin-top: 0.4rem; border-radius: 50%; background: var(--accent); }
  .when { font-size: 0.95rem; }
  .note { grid-column: 2; white-space: pre-wrap; font-size: 0.9rem; }
  .gap { padding: 0 0 0 1.75rem; font-size: 0.75rem; }
  .small { font-size: 0.75rem; }
</style>
