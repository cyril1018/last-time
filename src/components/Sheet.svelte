<script lang="ts">
  import type { Snippet } from 'svelte'
  import { sheets } from '../lib/sheet.svelte'

  let { title, children }: { title: string; children: Snippet } = $props()
  let panel: HTMLElement | undefined = $state()

  $effect(() => {
    panel?.querySelector('.body')?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
  })
</script>

<div class="backdrop" role="presentation" onclick={() => sheets.close()}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={title} bind:this={panel}>
  <header>
    <h2>{title}</h2>
    <button class="icon-btn" aria-label="關閉" onclick={() => sheets.close()}>✕</button>
  </header>
  <div class="body">{@render children()}</div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); z-index: 40; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; max-width: 600px; margin: 0 auto; max-height: 92dvh; overflow: auto; background: var(--surface); border-radius: 20px 20px 0 0; padding: 0.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 30px rgb(0 0 0 / 0.15); }
  header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
  h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
</style>
