import { describe, it, expect } from 'vitest'
import { guessEmoji, QUICK_EMOJIS, DEFAULT_EMOJI } from '../src/lib/emoji'

describe('guessEmoji', () => {
  it.each([
    ['洗床單', '🛏️'],
    ['打電話給爸媽', '📞'],
    ['剪頭髮', '✂️'],
    ['幫盆栽澆水', '🪴'],
    ['換飲水機濾心', '💧'],
    ['洗車', '🚗'],
    ['加油', '⛽'],
    ['跑步', '🏃'],
    ['看牙醫', '🦷'],
    ['吃藥', '💊'],
    ['倒垃圾', '🗑️'],
    ['掃地', '🧹'],
    ['洗衣服', '🫧'],
    ['餵貓', '🐱'],
    ['清冷氣', '❄️'],
    ['繳帳單', '🧾'],
    ['換電池', '🔋'],
    ['跟朋友聚餐', '🍻'],
    ['清冰箱', '🧊'],
    ['修水管', '🔧'],
    ['換瓦斯', '🔥'],
    ['轉帳給幣托扣款帳戶', '💸'],
    ['換床墊套', '🛏️'],
    ['換燈泡', '💡'],
    ['換機油', '🔄'],
  ])('%s → %s', (name, emoji) => {
    expect(guessEmoji(name)).toBe(emoji)
  })

  it('falls back to 📌', () => {
    expect(guessEmoji('整理抽屜')).toBe(DEFAULT_EMOJI)
    expect(guessEmoji('')).toBe(DEFAULT_EMOJI)
  })

  it('earlier rules win: 洗車 is car not bubbles, 吃藥 is pill not food', () => {
    expect(guessEmoji('洗車')).toBe('🚗')
    expect(guessEmoji('吃藥')).toBe('💊')
  })
})

describe('QUICK_EMOJIS', () => {
  it('has 20 unique entries including the default', () => {
    expect(QUICK_EMOJIS).toHaveLength(20)
    expect(new Set(QUICK_EMOJIS).size).toBe(20)
    expect(QUICK_EMOJIS).toContain(DEFAULT_EMOJI)
  })
})
