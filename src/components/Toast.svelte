<script lang="ts">
  import { toasts } from '../lib/toast.svelte'
</script>

<!-- The live region stays mounted, so screen readers are already watching it when a toast arrives; only its
     content is swapped. The {#key} still re-creates (and re-animates) the toast for every new one. -->
<div role="status" aria-live="polite">
  {#if toasts.current}
    {#key toasts.current.id}
      <div class="toast">
        <span class="msg">{toasts.current.message}</span>
        {#each toasts.current.actions as a (a.label)}
          <button onclick={() => { toasts.dismiss(); a.run() }}>{a.label}</button>
        {/each}
      </div>
    {/key}
  {/if}
</div>

<style>
  .toast { position: fixed; left: 50%; bottom: calc(5.5rem + env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(92vw, 560px); display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 14px; background: var(--toast-bg); color: var(--toast-text); box-shadow: 0 6px 24px rgb(0 0 0 / 0.25); z-index: 60; }
  .msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { border: 0; background: transparent; color: var(--toast-action); font-weight: 600; padding: 0.4rem 0.5rem; }
</style>
