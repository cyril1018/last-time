import { describe, it, expect, beforeEach, vi } from 'vitest'

const undoLog = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/app-store', () => ({ store: { undoLog, settings: { vibrate: true } } }))
const openSheet = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/sheet.svelte', () => ({ sheets: { open: openSheet } }))
vi.mock('../src/lib/haptics', () => ({ vibrate: vi.fn() }))

import { logAndToast } from '../src/lib/log-flow'
import { toasts } from '../src/lib/toast.svelte'
import { vibrate } from '../src/lib/haptics'
import { EmptyNameError, FutureTimeError, type LogResult } from '../src/lib/store.svelte'

const ts = new Date(2026, 9, 5, 9, 5).getTime()
const result: LogResult = {
  record: { id: 'r000000000001', itemId: 'i000000000001', ts, note: '' },
  item: { id: 'i000000000001', name: '吃藥', emoji: '💊', expectDays: null, archived: false, createdAt: ts },
  itemCreated: true,
} as unknown as LogResult

beforeEach(() => {
  toasts.dismiss()
  undoLog.mockClear()
  openSheet.mockClear()
  vi.mocked(vibrate).mockClear()
})

describe('logAndToast', () => {
  it('toasts the record with undo and note actions on success', async () => {
    const r = await logAndToast(Promise.resolve(result))
    expect(r).toBe(result)
    expect(vibrate).toHaveBeenCalledWith(30)
    expect(toasts.current?.message).toBe('已記錄 💊 吃藥 09:05')
    expect(toasts.current?.actions.map((a) => a.label)).toEqual(['復原', '備註'])

    toasts.current!.actions[0]!.run()
    expect(undoLog).toHaveBeenCalledWith(result)
    toasts.current!.actions[1]!.run()
    expect(openSheet).toHaveBeenCalledWith({ kind: 'edit-record', recordId: 'r000000000001' })
  })

  it('shows 請輸入名稱 and returns null on EmptyNameError', async () => {
    const r = await logAndToast(Promise.reject(new EmptyNameError()))
    expect(r).toBeNull()
    expect(toasts.current?.message).toBe('請輸入名稱')
    expect(toasts.current?.actions).toEqual([])
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('maps FutureTimeError and unknown errors to their messages', async () => {
    expect(await logAndToast(Promise.reject(new FutureTimeError()))).toBeNull()
    expect(toasts.current?.message).toBe('時間不能是未來')
    expect(await logAndToast(Promise.reject(new Error('boom')))).toBeNull()
    expect(toasts.current?.message).toBe('儲存失敗，請再試一次')
  })
})
