import { startHistory, onHistorySync, whenSettled, back, currentDepth, sheetMark } from './history-nav'

export type Route = { name: 'home' } | { name: 'item'; id: string } | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const item = /^\/item\/([^/]+)$/.exec(path)
  if (item) {
    try {
      return { name: 'item', id: decodeURIComponent(item[1]!) }
    } catch {
      return { name: 'home' } // malformed %-escape
    }
  }
  if (path === '/settings') return { name: 'settings' }
  return { name: 'home' }
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'item': return `#/item/${encodeURIComponent(r.id)}`
    case 'settings': return '#/settings'
  }
}

class Router {
  route = $state.raw<Route>({ name: 'home' })
  private homing = false

  start(): void {
    startHistory()
    this.sync()
    // popstate covers back/forward (pushState never fires hashchange); hashchange covers a hand-edited URL.
    // Both only re-read location.hash, so handling the same traversal twice is a no-op.
    onHistorySync(() => this.sync())
    window.addEventListener('hashchange', () => this.sync())
  }

  private sync(): void {
    const next = parseHash(location.hash)
    if (routeToHash(next) !== routeToHash(this.route)) this.route = next
  }

  /** Open a page on top of the current one: one history entry, depth + 1. */
  navigate(r: Route): void {
    whenSettled(() => {
      const hash = routeToHash(r)
      if (hash === routeToHash(this.route)) return
      history.pushState({ depth: currentDepth() + 1 }, '', hash)
      this.route = r
    })
  }

  replace(r: Route): void {
    history.replaceState(history.state, '', routeToHash(r))
    this.route = r
  }

  /**
   * Go to home the way the back key would: pop pages (and an open sheet's entry) one at a time until the
   * entry the app was opened on; if that entry is not home (deep link), rewrite it to home. Never leaves
   * the app and never leaves a duplicate home entry. Repeated calls while on the way are ignored.
   */
  home(): void {
    if (this.homing) return
    this.homing = true
    const step = () => {
      if (currentDepth() > 0 || sheetMark() !== undefined) {
        back()
        whenSettled(step)
        return
      }
      this.homing = false
      if (this.route.name !== 'home') this.replace({ name: 'home' })
    }
    whenSettled(step)
  }
}

export const router = new Router()
