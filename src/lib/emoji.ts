export const DEFAULT_EMOJI = '📌'

export type EmojiCategoryId = 'chores' | 'care' | 'health' | 'exercise' | 'living' | 'transport' | 'money' | 'home' | 'social'

export interface EmojiRule { zh: readonly string[]; en: readonly string[]; emoji: string }

/** Spec §4.3 (2026-10-14 i18n design), ordered: first keyword hit wins, Chinese or English. */
export const EMOJI_RULES: readonly EmojiRule[] = [
  { zh: ['床單', '棉被', '枕', '床'], en: ['bed', 'bedding', 'sheet', 'pillow', 'duvet', 'blanket'], emoji: '🛏️' },
  { zh: ['電話', '爸', '媽'], en: ['call', 'phone', 'mom', 'mum', 'dad', 'parent', 'grandma', 'grandpa'], emoji: '📞' },
  { zh: ['剪'], en: ['cut', 'trim', 'clip', 'nail'], emoji: '✂️' },
  { zh: ['頭髮'], en: ['haircut', 'hair', 'barber'], emoji: '💇' },
  { zh: ['澆', '盆栽', '植'], en: ['plant', 'garden', 'repot', 'succulent'], emoji: '🪴' },
  { zh: ['花'], en: ['flower'], emoji: '🌸' },
  { zh: ['濾'], en: ['filter'], emoji: '💧' },
  { zh: ['洗車', '車'], en: ['car', 'vehicle'], emoji: '🚗' },
  { zh: ['加油'], en: ['fuel', 'refuel', 'petrol', 'gas station', 'fill up'], emoji: '⛽' },
  { zh: ['跑'], en: ['run', 'running', 'jog', 'jogging'], emoji: '🏃' },
  { zh: ['健身'], en: ['gym', 'workout', 'weights'], emoji: '🏋️' },
  { zh: ['游泳'], en: ['swim', 'swimming'], emoji: '🏊' },
  { zh: ['牙'], en: ['teeth', 'tooth', 'dentist', 'floss'], emoji: '🦷' },
  { zh: ['醫', '健檢'], en: ['doctor', 'checkup', 'check-up', 'clinic', 'hospital'], emoji: '🩺' },
  { zh: ['藥'], en: ['medicine', 'meds', 'medication', 'pill', 'vitamin'], emoji: '💊' },
  { zh: ['垃圾'], en: ['trash', 'garbage', 'rubbish', 'recycling', 'bin'], emoji: '🗑️' },
  { zh: ['掃', '拖'], en: ['sweep', 'mop', 'vacuum', 'clean'], emoji: '🧹' },
  { zh: ['洗'], en: ['wash', 'laundry'], emoji: '🧼' },
  { zh: ['貓'], en: ['cat', 'kitten', 'litter'], emoji: '🐱' },
  { zh: ['狗'], en: ['dog', 'puppy'], emoji: '🐶' },
  { zh: ['魚'], en: ['fish', 'aquarium'], emoji: '🐟' },
  { zh: ['冷氣'], en: ['ac', 'aircon', 'air con', 'air conditioner'], emoji: '❄️' },
  { zh: ['書'], en: ['book', 'read', 'library'], emoji: '📚' },
  { zh: ['電影'], en: ['movie', 'film', 'cinema'], emoji: '🎬' },
  { zh: ['旅'], en: ['travel', 'trip', 'flight', 'vacation', 'holiday'], emoji: '✈️' },
  { zh: ['按摩'], en: ['massage', 'spa'], emoji: '💆' },
  { zh: ['繳'], en: ['pay', 'paid', 'bill', 'invoice', 'tax', 'fee'], emoji: '🧾' },
  { zh: ['電池'], en: ['battery', 'batteries', 'charge'], emoji: '🔋' },
  { zh: ['燈'], en: ['light', 'bulb', 'lamp'], emoji: '💡' },
  { zh: ['朋友', '聚'], en: ['friend', 'meet', 'catch up', 'party', 'hangout'], emoji: '🍻' },
  { zh: ['吃'], en: ['eat', 'dinner', 'lunch', 'restaurant'], emoji: '🍜' },
  { zh: ['冰箱'], en: ['fridge', 'refrigerator', 'freezer'], emoji: '🧊' },
  { zh: ['窗'], en: ['window'], emoji: '🪟' },
  { zh: ['修'], en: ['fix', 'repair', 'maintenance', 'service'], emoji: '🔧' },
  { zh: ['瓦斯'], en: ['gas tank', 'gas cylinder', 'propane', 'stove'], emoji: '🔥' },
  { zh: ['轉帳', '匯款', '帳戶'], en: ['transfer', 'rent', 'deposit', 'bank account', 'savings'], emoji: '💸' },
  { zh: ['換'], en: ['change', 'replace', 'swap', 'renew'], emoji: '🔄' },
]

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A whole English word or phrase, optionally followed by -s/-es/-ed/-ing: `car` hits "Car wash", not "card". */
const englishMatchers: readonly (readonly RegExp[])[] = EMOJI_RULES.map((r) =>
  r.en.map((k) => new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(k)}(?:s|es|ed|ing)?(?![a-z0-9])`)),
)

export function guessEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [i, rule] of EMOJI_RULES.entries()) {
    if (rule.zh.some((k) => name.includes(k)) || englishMatchers[i]!.some((re) => re.test(lower))) return rule.emoji
  }
  return DEFAULT_EMOJI
}

export const QUICK_EMOJIS: readonly string[] = [
  '📌', '🛏️', '📞', '💊', '💧', '🔥', '💸', '🧹', '🧼', '🚗',
  '🏃', '🦷', '🩺', '🗑️', '🪴', '🍜', '🧾', '🔋', '💡', '🔧',
]
