import { store } from '../app-store'
import type { Locale } from '../types'
import { resolveLocale, dateLocaleFor } from './locale'
import { messagesFor, type Messages } from './messages'

/** `navigator.languages`, or [] where it is missing (old WebViews, node). */
export function readLanguages(nav: { languages?: readonly string[] } | undefined = globalThis.navigator): readonly string[] {
  return nav?.languages ? [...nav.languages] : []
}

class I18n {
  /** The phone's language list; kept current by start(). Tests assign it directly. */
  languages = $state.raw<readonly string[]>(readLanguages())
  readonly locale: Locale = $derived(resolveLocale(store.settings.language, this.languages))
  readonly dateLocale: string = $derived(dateLocaleFor(this.locale, this.languages))
  readonly t: Messages = $derived(messagesFor(this.locale))

  /** Follows system language changes while the app is open. Returns the cleanup. */
  start(): () => void {
    const update = () => { this.languages = readLanguages() }
    window.addEventListener('languagechange', update)
    return () => window.removeEventListener('languagechange', update)
  }
}

export const i18n = new I18n()
