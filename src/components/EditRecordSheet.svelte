<script lang="ts">
  import { untrack } from 'svelte'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../lib/format'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { FutureTimeError } from '../lib/store.svelte'
  import Sheet from './Sheet.svelte'

  let { recordId }: { recordId: string } = $props()
  // The parent keys this sheet by recordId, so the initial value is the only one this instance ever sees.
  const initialId = untrack(() => recordId)
  const record = $derived(store.recordById(initialId))
  // Snapshot of the record at open time: seeds the form and detects an untouched time field.
  const initial = untrack(() => record)
  const initialWhen = initial ? toDatetimeLocalValue(initial.ts) : ''
  const item = $derived(record ? store.itemById(record.itemId) : undefined)
  const KEY = `edit-record.${initialId}`
  type Draft = { when: string; note: string }
  const draft = loadDraft<Draft>(KEY)

  let when = $state(draft?.when ?? initialWhen)
  let note = $state(draft?.note ?? initial?.note ?? '')
  $effect(() => { saveDraft(KEY, { when, note } satisfies Draft) })
  // Cancelling (back / backdrop) unmounts the sheet and discards the draft. A tab killed by the OS never
  // runs this teardown, so the draft survives reclaim.
  $effect(() => () => clearDraft(KEY))

  const max = $derived(toDatetimeLocalValue(store.now))

  async function save() {
    // `when` is minute-truncated: only send ts when the user changed it, so a note-only edit keeps the original seconds.
    const patch: { ts?: number; note: string } = { note: note.trim() }
    if (when !== initialWhen) {
      const ts = fromDatetimeLocalValue(when)
      if (ts === null) { toasts.show('請選擇時間'); return }
      patch.ts = ts
    }
    try {
      await store.updateRecord(initialId, patch)
      clearDraft(KEY)
      sheets.close()
    } catch (e) {
      toasts.show(e instanceof FutureTimeError ? '時間不能是未來' : '儲存失敗，請再試一次')
    }
  }

  async function remove() {
    if (!confirm('刪除這筆紀錄？')) return
    try {
      await store.deleteRecord(initialId)
    } catch {
      toasts.show('刪除失敗，請再試一次')
      return
    }
    clearDraft(KEY)
    sheets.close()
  }

  $effect(() => { if (!record) sheets.close() })
</script>

<Sheet title={item ? `${item.emoji} ${item.name}` : '紀錄'}>
  <label class="field"><span>時間</span><input type="datetime-local" bind:value={when} {max} step="60" /></label>
  <label class="field"><span>備註</span><textarea bind:value={note} rows="3" placeholder="可留空"></textarea></label>
  <div class="actions">
    <button class="btn danger" onclick={remove}>刪除這筆</button>
    <button class="btn primary" onclick={save}>儲存</button>
  </div>
</Sheet>

<style>
  .actions { display: flex; justify-content: space-between; gap: 0.5rem; }
</style>
