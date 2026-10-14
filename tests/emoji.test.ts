import { describe, it, expect } from 'vitest'
import { guessEmoji, QUICK_EMOJIS, DEFAULT_EMOJI, EMOJI_RULES } from '../src/lib/emoji'

describe('guessEmoji (Chinese)', () => {
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
    ['洗衣服', '🧼'],
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

  it('earlier rules win: 洗車 is car not soap, 吃藥 is pill not food', () => {
    expect(guessEmoji('洗車')).toBe('🚗')
    expect(guessEmoji('吃藥')).toBe('💊')
  })
})

describe('guessEmoji (English)', () => {
  it.each([
    ['Water plants', '🪴'],
    ['Haircut', '💇'],
    ['wash car', '🚗'],
    ['Car wash', '🚗'],
    ['card', DEFAULT_EMOJI],
    ['CAT FOOD', '🐱'],
    ['Change water filter', '💧'],
    ['running', '🏃'],
    ['Pay rent', '🧾'],
    ['air conditioner filter', '💧'],
    ['Clean the AC', '🧹'],
    ['Do laundry', '🧼'],
    ['Call mom', '📞'],
    ['Dentist', '🦷'],
    ['Take vitamins', '💊'],
    ['vacation', '✈️'],
    ['Replace gas tank', '🔥'],
    ['catch up with Sam', '🍻'],
    ['Take meds', '💊'],
    ['Haircut appointment', '💇'],
  ])('%s → %s', (name, emoji) => {
    expect(guessEmoji(name)).toBe(emoji)
  })

  it.each([
    ['CAR-WASH', '🚗'],
    ['Dentist!', '🦷'],
    ["Mom's call", '📞'],
    ['  plants  ', '🪴'],
    ['washed sheets', '🛏️'],
  ])('punctuation and case: %s → %s', (name, emoji) => {
    expect(guessEmoji(name)).toBe(emoji)
  })

  it('does not match inside other words', () => {
    expect(guessEmoji('scar')).toBe(DEFAULT_EMOJI)
    expect(guessEmoji('concatenate')).toBe(DEFAULT_EMOJI)
    expect(guessEmoji('parental')).toBe(DEFAULT_EMOJI)
  })
})

describe('EMOJI_RULES', () => {
  it('has the 37 rows of spec §4.3', () => {
    expect(EMOJI_RULES).toHaveLength(37)
  })

  it.each(EMOJI_RULES.flatMap((r, row) => r.zh.map((k) => [row + 1, k, r.emoji] as const)))(
    'rule %i: Chinese keyword %s → %s',
    (_row, keyword, emoji) => {
      expect(guessEmoji(keyword)).toBe(emoji)
      expect(guessEmoji(`每週${keyword}一次`)).toBe(emoji)
    },
  )

  it.each(EMOJI_RULES.flatMap((r, row) => r.en.map((k) => [row + 1, k, r.emoji] as const)))(
    'rule %i: English keyword %s → %s',
    (_row, keyword, emoji) => {
      expect(guessEmoji(keyword)).toBe(emoji)
      expect(guessEmoji(keyword.toUpperCase())).toBe(emoji)
      expect(guessEmoji(`weekly ${keyword} reminder`)).toBe(emoji)
    },
  )
})

describe('QUICK_EMOJIS', () => {
  it('has 20 unique entries including the default', () => {
    expect(QUICK_EMOJIS).toHaveLength(20)
    expect(new Set(QUICK_EMOJIS).size).toBe(20)
    expect(QUICK_EMOJIS).toContain(DEFAULT_EMOJI)
  })
  it('swapped 🫧 for 🧼, which older phones can show', () => {
    expect(QUICK_EMOJIS).toContain('🧼')
    expect(QUICK_EMOJIS).not.toContain('🫧')
  })
})
