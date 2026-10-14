import type { Locale } from '../types'
import { zhTW, type Messages } from './zh-TW'
import { en } from './en'

export type { Messages }

export function messagesFor(locale: Locale): Messages {
  return locale === 'en' ? en : zhTW
}
