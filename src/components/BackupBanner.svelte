<script lang="ts">
  import { router } from '../lib/router.svelte'
  let { onlater }: { onlater: () => void } = $props()
</script>

<div class="banner" role="note">
  <span>資料只存在這支手機的瀏覽器裡，建議備份一份。</span>
  <button class="btn" onclick={() => router.navigate({ name: 'settings' })}>去備份</button>
  <button class="icon-btn" onclick={onlater}>之後</button>
</div>

<style>
  .banner { display: flex; align-items: center; gap: 0.5rem; margin: 0 1rem 0.5rem; padding: 0.6rem 0.9rem; border-radius: var(--radius); background: var(--accent-soft); font-size: 0.85rem; }
  span { flex: 1; }
</style>
