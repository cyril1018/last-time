<script lang="ts">
  let { value = $bindable(''), onsubmit, autofocus = false }: { value: string; onsubmit: () => void; autofocus?: boolean } = $props()
  let input: HTMLInputElement | undefined = $state()
  $effect(() => { if (autofocus) input?.focus() })
</script>

<form class="bar" onsubmit={(e) => { e.preventDefault(); onsubmit() }}>
  <input bind:this={input} bind:value type="search" enterkeyhint="done" autocomplete="off"
         placeholder="搜尋或新增一件事" aria-label="搜尋或新增一件事" />
</form>

<style>
  .bar { position: sticky; bottom: 0; padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom)); background: var(--bg); }
  input { width: 100%; padding: 0.85rem 1rem; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-size: 1rem; }
</style>
