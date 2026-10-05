<script lang="ts">
  import { untrack } from 'svelte'
  import type { ParsedBackup } from '../lib/backup'
  import { summarize, planMerge, planReplace } from '../lib/backup'
  import { store } from '../lib/app-store'
  import { sheets } from '../lib/sheet.svelte'
  import { toasts } from '../lib/toast.svelte'
  import Sheet from './Sheet.svelte'

  let { backup: backupProp }: { backup: ParsedBackup } = $props()
  // sheets.current becomes null as soon as the sheet closes, so capture the backup once.
  const backup = untrack(() => backupProp)
  const s = summarize(backup)
  const exported = s.exportedAt ? new Date(s.exportedAt) : null
  const exportedText = exported && !Number.isNaN(exported.getTime()) ? exported.toLocaleString('zh-TW') : '不明'

  async function merge() {
    const plan = planMerge({ items: store.items, records: store.records }, backup)
    try {
      await store.mergeIn(plan.items, plan.records)
      sheets.close()
      toasts.show(`已匯入 ${plan.items.length} 個項目、${plan.records.length} 筆紀錄`)
    } catch {
      toasts.show('匯入失敗，資料未變動')
    }
  }

  async function replace() {
    if (!confirm('覆蓋現有資料？目前的項目和紀錄會全部刪除，無法復原。')) return
    const plan = planReplace(backup)
    try {
      await store.replaceWith(plan.items, plan.records)
      store.updateSettings({ ...backup.settings })
      sheets.close()
      toasts.show(`已匯入 ${plan.items.length} 個項目、${plan.records.length} 筆紀錄`)
    } catch {
      toasts.show('匯入失敗，資料未變動')
    }
  }
</script>

<Sheet title="匯入備份">
  <dl>
    <dt class="muted">匯出日期</dt><dd>{exportedText}</dd>
    <dt class="muted">項目</dt><dd>{s.itemCount} 個</dd>
    <dt class="muted">紀錄</dt><dd>{s.recordCount} 筆</dd>
  </dl>
  <div class="actions">
    <button class="btn" onclick={merge}>合併到現有資料</button>
    <button class="btn danger" onclick={replace}>覆蓋現有資料</button>
  </div>
  <p class="muted small">合併：已有的項目和紀錄不動，只加入新的。覆蓋：先清空再寫入，並套用備份裡的主題和震動設定。</p>
</Sheet>

<style>
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; margin: 0 0 1rem; }
  dd { margin: 0; }
  .actions { display: grid; gap: 0.5rem; }
  .small { font-size: 0.8rem; }
</style>
