<script lang="ts">
  import { toasts } from '../lib/toast.svelte'
</script>

{#if toasts.current}
  {#key toasts.current.id}
    <div class="toast" role="status" aria-live="polite">
      <span class="msg">{toasts.current.message}</span>
      {#each toasts.current.actions as a (a.label)}
        <button onclick={() => { toasts.dismiss(); a.run() }}>{a.label}</button>
      {/each}
    </div>
  {/key}
{/if}

<style>
  .toast { position: fixed; left: 50%; bottom: calc(5.5rem + env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(92vw, 560px); display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 14px; background: var(--toast-bg); color: var(--toast-text); box-shadow: 0 6px 24px rgb(0 0 0 / 0.25); z-index: 60; }
  .msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { border: 0; background: transparent; color: var(--accent); font-weight: 600; padding: 0.4rem 0.5rem; }
</style>
