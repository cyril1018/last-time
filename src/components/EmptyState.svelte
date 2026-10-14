<script lang="ts">
  import { i18n } from '../lib/i18n/i18n.svelte'
  let { onpick, note }: { onpick: (text: string) => void; note?: string } = $props()
</script>

<div class="empty">
  <p>{i18n.t.empty.intro}</p>
  <p class="muted">{i18n.t.empty.howTo}</p>
  <div class="chips">
    {#each i18n.t.empty.samples as s (s)}
      <button class="btn" onclick={() => onpick(s)}>{s}</button>
    {/each}
  </div>
  {#if note}<p class="note muted">{note}</p>{/if}
</div>

<style>
  .empty { padding: 3rem 1.5rem; text-align: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
  .note { margin: 1.5rem 0 0; font-size: 0.75rem; }
</style>
