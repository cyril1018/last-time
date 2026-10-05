<script lang="ts">
  import { untrack } from 'svelte'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { monthLabel, combineDateTime } from '../lib/calendar'
  import { toDateKey } from '../lib/format'
  import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
  import { FutureTimeError } from '../lib/store.svelte'
  import { exclusive } from '../lib/exclusive'
  import Sheet from './Sheet.svelte'
  import MonthCalendar from './MonthCalendar.svelte'

  let { itemId }: { itemId: string } = $props()
  // The parent keys this sheet by itemId and passes a getter over sheets.current, which becomes null on close:
  // read the prop once and never again.
  const initialId = untrack(() => itemId)
  const KEY = `backdate.${initialId}`
  type Draft = { selected: string[]; time: string; year: number; month0: number }
  const draft = loadDraft<Draft>(KEY)
  const today = new Date(store.now)

  let year = $state(draft?.year ?? today.getFullYear())
  let month0 = $state(draft?.month0 ?? today.getMonth())
  let time = $state(draft?.time ?? '12:00')
  let selected = $state(new Set<string>(draft?.selected ?? []))
  $effect(() => { saveDraft(KEY, { selected: [...selected], time, year, month0 } satisfies Draft) })
  // Cancelling (back / backdrop) unmounts the sheet and discards the draft. A tab killed by the OS never
  // runs this teardown, so the draft survives reclaim.
  $effect(() => () => clearDraft(KEY))

  const marked = $derived(new Set(store.recordsOf(initialId).map((r) => toDateKey(r.ts))))

  // Item gone (creation undone, or missing after a reload): nothing to add to.
  $effect(() => { if (!store.itemById(initialId)) sheets.close() })

  function toggle(key: string) {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key); else next.add(key)
    selected = next
  }
  function shift(delta: number) {
    const d = new Date(year, month0 + delta, 1)
    year = d.getFullYear(); month0 = d.getMonth()
  }

  // No undo for a batch add, so a double tap must never insert it twice.
  const add = exclusive(async () => {
    const tss: number[] = []
    for (const key of selected) {
      const [y, m, d] = key.split('-').map(Number)
      const ts = combineDateTime(new Date(y!, m! - 1, d!).getTime(), time)
      if (ts === null) { toasts.show('請輸入有效時間'); return }
      tss.push(ts)
    }
    try {
      await store.addRecords(initialId, tss)
      clearDraft(KEY)
      sheets.close()
      toasts.show(`已加入 ${tss.length} 筆`)
    } catch (e) {
      toasts.show(e instanceof FutureTimeError ? '時間不能是未來' : '儲存失敗，請再試一次')
    }
  })
</script>

<Sheet title="補其他日期">
  <div class="nav">
    <button class="icon-btn" aria-label="上個月" onclick={() => shift(-1)}>‹</button>
    <strong>{monthLabel(year, month0)}</strong>
    <button class="icon-btn" aria-label="下個月" onclick={() => shift(1)}>›</button>
  </div>
  <MonthCalendar {year} {month0} todayTs={store.now} {selected} {marked} ontoggle={toggle} />
  <label class="field" style="margin-top:1rem"><span>時間（套用到每一天）</span><input type="time" bind:value={time} step="60" /></label>
  <button class="btn primary wide" disabled={selected.size === 0} onclick={add}>加入 {selected.size} 天</button>
</Sheet>

<style>
  .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .wide { width: 100%; }
</style>
