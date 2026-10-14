<script lang="ts">
  import { untrack } from 'svelte'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { router } from '../lib/router.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { QUICK_EMOJIS, EMOJI_CATEGORIES } from '../lib/emoji'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { saveErrorMessage } from '../lib/error-messages'
  import { i18n } from '../lib/i18n/i18n.svelte'
  import { exclusive } from '../lib/exclusive'
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

  // The full picker; not part of the draft, so it always reopens collapsed.
  let showMore = $state(false)
  let moreBtn: HTMLButtonElement | undefined = $state()
  function pickMore(q: string) {
    emoji = q
    showMore = false
    moreBtn?.focus()
  }

  const recordCount = $derived(store.recordsOf(initialId).length)

  // Item gone (deleted elsewhere, creation undone, or missing after a reload): nothing left to edit.
  $effect(() => { if (!store.itemById(initialId)) sheets.close() })

  const save = exclusive(async () => {
    try {
      await store.updateItem(initialId, { name, emoji, expectDays, archived })
      clearDraft(KEY)
      sheets.close()
    } catch (e) {
      toasts.show(saveErrorMessage(e, i18n.locale)) // empty name / duplicate name / save failed
    }
  })

  async function remove() {
    if (!confirm(i18n.t.editItem.confirmDelete(item?.name ?? '', recordCount))) return
    clearDraft(KEY)
    sheets.closeThen(async () => {
      try {
        await store.deleteItem(initialId)
        router.home()
      } catch {
        toasts.show(i18n.t.common.deleteFailed)
      }
    })
  }
</script>

<Sheet title={i18n.t.editItem.title}>
  <label class="field"><span>{i18n.t.editItem.name}</span><input bind:value={name} required /></label>
  <label class="field"><span>{i18n.t.editItem.icon}</span><input bind:value={emoji} maxlength="8" /></label>
  <div class="quick" role="group" aria-label={i18n.t.editItem.quickIcons}>
    {#each QUICK_EMOJIS as q (q)}
      <button type="button" class:on={q === emoji} onclick={() => { emoji = q }} aria-label={i18n.t.editItem.pick(q)}>{q}</button>
    {/each}
    <button type="button" bind:this={moreBtn} aria-label={i18n.t.editItem.more} aria-expanded={showMore} aria-controls="more-emoji"
            onclick={() => { showMore = !showMore }}>⋯</button>
  </div>
  {#if showMore}
    <div id="more-emoji" class="more">
      {#each EMOJI_CATEGORIES as cat (cat.id)}
        <div role="group" aria-label={i18n.t.emojiCategories[cat.id]}>
          <!-- A caption, not a heading: the group's aria-label already names it for screen readers. -->
          <div class="cat muted small" aria-hidden="true">{i18n.t.emojiCategories[cat.id]}</div>
          <div class="quick">
            {#each cat.emojis as q (q)}
              <button type="button" class:on={q === emoji} onclick={() => pickMore(q)} aria-label={i18n.t.editItem.pick(q)}>{q}</button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <label class="field"><span>{i18n.t.editItem.expectDays}</span><input bind:value={expectDays} inputmode="numeric" pattern="[0-9]*" placeholder={i18n.t.editItem.expectPlaceholder} /></label>
  <label class="toggle"><input type="checkbox" bind:checked={archived} /> {i18n.t.editItem.archive}</label>
  <div class="actions">
    <button class="btn danger" onclick={remove}>{i18n.t.editItem.delete}</button>
    <button class="btn primary" onclick={save}>{i18n.t.common.save}</button>
  </div>
</Sheet>

<style>
  .quick { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: -0.5rem 0 1rem; }
  .quick button { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; width: 2.5rem; height: 2.5rem; font-size: 1.25rem; }
  .quick button.on { border-color: var(--accent); background: var(--accent-soft); }
  .more { margin: -0.5rem 0 1rem; }
  .more .cat { margin: 0.75rem 0 0.35rem; font-weight: 500; }
  .more .quick { margin: 0; }
  .toggle { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.25rem; }
  .actions { display: flex; justify-content: space-between; gap: 0.5rem; }
</style>
