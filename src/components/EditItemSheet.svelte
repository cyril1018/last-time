<script lang="ts">
  import { untrack } from 'svelte'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { router } from '../lib/router.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { QUICK_EMOJIS } from '../lib/emoji'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { EmptyNameError } from '../lib/store.svelte'
  import Sheet from './Sheet.svelte'

  let { itemId }: { itemId: string } = $props()
  // The parent keys this sheet by itemId, so the initial value is the only one this instance ever sees.
  const initialId = untrack(() => itemId)
  const item = store.itemById(initialId)
  const KEY = `edit-item.${initialId}`
  type Draft = { name: string; emoji: string; expectDays: string; archived: boolean }
  const draft = loadDraft<Draft>(KEY)

  let name = $state(draft?.name ?? item?.name ?? '')
  let emoji = $state(draft?.emoji ?? item?.emoji ?? '📌')
  let expectDays = $state(draft?.expectDays ?? (item?.expectDays === null || item?.expectDays === undefined ? '' : String(item.expectDays)))
  let archived = $state(draft?.archived ?? item?.archived ?? false)
  $effect(() => { saveDraft(KEY, { name, emoji, expectDays, archived } satisfies Draft) })
  // Cancelling (back / backdrop) unmounts the sheet and discards the draft. A tab killed by the OS never
  // runs this teardown, so the draft survives reclaim.
  $effect(() => () => clearDraft(KEY))

  const recordCount = $derived(store.recordsOf(initialId).length)

  async function save() {
    try {
      await store.updateItem(initialId, { name, emoji, expectDays, archived })
      clearDraft(KEY)
      sheets.close()
    } catch (e) {
      toasts.show(e instanceof EmptyNameError ? '請輸入名稱' : '儲存失敗，請再試一次')
    }
  }

  async function remove() {
    if (!confirm(`刪除「${item?.name ?? ''}」？會連同 ${recordCount} 筆紀錄一起刪除，無法復原。`)) return
    clearDraft(KEY)
    sheets.closeThen(async () => {
      try {
        await store.deleteItem(initialId)
        router.replace({ name: 'home' })
      } catch {
        toasts.show('刪除失敗，請再試一次')
      }
    })
  }
</script>

<Sheet title="編輯項目">
  <label class="field"><span>名稱</span><input bind:value={name} required /></label>
  <label class="field"><span>圖示</span><input bind:value={emoji} maxlength="8" /></label>
  <div class="quick" role="group" aria-label="常用圖示">
    {#each QUICK_EMOJIS as q (q)}
      <button type="button" class:on={q === emoji} onclick={() => { emoji = q }} aria-label="選擇 {q}">{q}</button>
    {/each}
  </div>
  <label class="field"><span>大概多久做一次（天，留空不判斷）</span><input bind:value={expectDays} inputmode="numeric" pattern="[0-9]*" placeholder="例如 14" /></label>
  <label class="toggle"><input type="checkbox" bind:checked={archived} /> 封存（首頁不顯示，紀錄保留）</label>
  <div class="actions">
    <button class="btn danger" onclick={remove}>刪除項目</button>
    <button class="btn primary" onclick={save}>儲存</button>
  </div>
</Sheet>

<style>
  .quick { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: -0.5rem 0 1rem; }
  .quick button { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; width: 2.5rem; height: 2.5rem; font-size: 1.25rem; }
  .quick button.on { border-color: var(--accent); background: var(--accent-soft); }
  .toggle { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.25rem; }
  .actions { display: flex; justify-content: space-between; gap: 0.5rem; }
</style>
