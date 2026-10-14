<script lang="ts">
  import { router } from '../lib/router.svelte'
  import { i18n } from '../lib/i18n/i18n.svelte'
  let { onlater }: { onlater: () => void } = $props()
</script>

<div class="banner" role="note">
  <span>{i18n.t.banner.text}</span>
  <button class="btn" onclick={() => router.navigate({ name: 'settings' })}>{i18n.t.banner.go}</button>
  <button class="icon-btn" onclick={onlater}>{i18n.t.banner.later}</button>
</div>

<style>
  .banner { display: flex; align-items: center; gap: 0.5rem; margin: 0 1rem 0.5rem; padding: 0.6rem 0.9rem; border-radius: var(--radius); background: var(--accent-soft); font-size: 0.85rem; }
  span { flex: 1; }
</style>
