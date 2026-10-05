import { describe, it, expect } from 'vitest'
import { saveErrorMessage } from '../src/lib/error-messages'
import { DuplicateNameError, EmptyNameError, FutureTimeError, InvalidTimeError, NotFoundError } from '../src/lib/store.svelte'

describe('saveErrorMessage', () => {
  it.each([
    [new EmptyNameError(), '請輸入名稱'],
    [new DuplicateNameError(), '已有同名項目'],
    [new FutureTimeError(), '時間不能是未來'],
    [new InvalidTimeError(), '時間格式不正確'],
    [new NotFoundError('item'), '儲存失敗，請再試一次'],
    [new Error('db'), '儲存失敗，請再試一次'],
    ['not even an error', '儲存失敗，請再試一次'],
  ])('%s → %s', (e, msg) => {
    expect(saveErrorMessage(e)).toBe(msg)
  })
})
