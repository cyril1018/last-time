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

  start(): void {
    this.route = parseHash(location.hash)
    window.addEventListener('hashchange', () => { this.route = parseHash(location.hash) })
  }

  navigate(r: Route): void {
    location.hash = routeToHash(r)
  }

  replace(r: Route): void {
    history.replaceState(history.state, '', routeToHash(r))
    this.route = r
  }

  back(): void {
    history.back()
  }
}

export const router = new Router()
