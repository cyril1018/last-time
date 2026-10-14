<script lang="ts">
  import { untrack } from 'svelte'
  import type { ParsedBackup } from '../lib/backup'
  import { summarize, planMerge, planReplace } from '../lib/backup'
  import { store } from '../lib/app-store'
  import { i18n } from '../lib/i18n/i18n.svelte'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import { exclusive } from '../lib/exclusive'
  import Sheet from './Sheet.svelte'

  let { backup: backupProp }: { backup: ParsedBackup } = $props()
  // sheets.current becomes null as soon as the sheet closes, so capture the backup once.
  const backup = untrack(() => backupProp)
  const s = summarize(backup)
  const exported = s.exportedAt ? new Date(s.exportedAt) : null
  const exportedText = exported && !Number.isNaN(exported.getTime()) ? exported.toLocaleString(i18n.dateLocale) : i18n.t.import.unknown

  // One guard for both buttons: a merge in flight blocks a replace and vice versa.
  const guarded = exclusive((task: () => Promise<void>) => task())

  const merge = () => guarded(async () => {
    const plan = planMerge({ items: store.items, records: store.records }, backup)
    try {
      await store.mergeIn(plan.items, plan.records)
      sheets.close()
      toasts.show(i18n.t.import.imported(plan.items.length, plan.records.length))
    } catch {
      toasts.show(i18n.t.import.failed)
    }
  })

  const replace = () => guarded(async () => {
    if (!confirm(i18n.t.import.confirmReplace)) return
    const plan = planReplace(backup)
    try {
      await store.replaceWith(plan.items, plan.records)
      store.updateSettings({ ...backup.settings })
      sheets.close()
      toasts.show(i18n.t.import.imported(plan.items.length, plan.records.length))
    } catch {
      toasts.show(i18n.t.import.failed)
    }
  })
</script>

<Sheet title={i18n.t.import.title}>
  <dl>
    <dt class="muted">{i18n.t.import.exportedAt}</dt><dd>{exportedText}</dd>
    <dt class="muted">{i18n.t.import.items}</dt><dd>{i18n.t.import.itemCount(s.itemCount)}</dd>
    <dt class="muted">{i18n.t.import.records}</dt><dd>{i18n.t.import.recordCount(s.recordCount)}</dd>
  </dl>
  <div class="actions">
    <button class="btn" onclick={merge}>{i18n.t.import.merge}</button>
    <button class="btn danger" onclick={replace}>{i18n.t.import.replace}</button>
  </div>
  <p class="muted small">{i18n.t.import.explain}</p>
</Sheet>

<style>
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; margin: 0 0 1rem; }
  dd { margin: 0; }
  .actions { display: grid; gap: 0.5rem; }
  .small { font-size: 0.8rem; }
</style>
