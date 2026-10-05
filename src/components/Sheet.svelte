<script lang="ts">
  import type { Snippet } from 'svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { modal } from '../lib/modal'

  let { title, children }: { title: string; children: Snippet } = $props()

  // Focus the first field on open (the dialog itself if it has none), keep Tab inside, Escape = back key,
  // and hand focus back to whatever opened the sheet once it closes.
  const dialog = modal({ onEscape: () => sheets.close(), initialFocusWithin: '.body' })
</script>

<div class="backdrop" role="presentation" onclick={() => sheets.close()}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" {@attach dialog}>
  <header>
    <h2>{title}</h2>
    <button class="icon-btn" aria-label="關閉" onclick={() => sheets.close()}>✕</button>
  </header>
  <div class="body">{@render children()}</div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); z-index: 40; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; max-width: 600px; margin: 0 auto; max-height: 92dvh; overflow: auto; background: var(--surface); border-radius: 20px 20px 0 0; padding: 0.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 30px rgb(0 0 0 / 0.15); }
  .sheet:focus { outline: none; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
</style>
