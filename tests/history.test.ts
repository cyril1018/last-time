import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FakeBrowser } from './fake-browser'

type RouterMod = typeof import('../src/lib/router.svelte')
type SheetMod = typeof import('../src/lib/sheet.svelte')

let b: FakeBrowser
let router: RouterMod['router']
let sheets: SheetMod['sheets']

/** Fresh page load: new module instances (router, sheets, history coordinator) over the given history. */
async function boot(browser: FakeBrowser) {
  b = browser
  b.install()
  vi.resetModules()
  router = (await import('../src/lib/router.svelte')).router
  sheets = (await import('../src/lib/sheet.svelte')).sheets
  router.start()
  sheets.start()
  await b.flush()
}

const depthOf = (s: unknown) => (s as { depth?: number } | null)?.depth ?? 0

beforeEach(async () => { await boot(new FakeBrowser('')) })
afterEach(() => { vi.unstubAllGlobals() })

describe('router depth bookkeeping', () => {
  it('navigate pushes depth + 1 with the hash and sets the route itself', async () => {
    router.navigate({ name: 'item', id: 'x' })
    expect(router.route).toEqual({ name: 'item', id: 'x' })
    expect(b.hashes()).toEqual(['', '#/item/x'])
    expect(depthOf(b.top.state)).toBe(1)
    await b.flush()
    expect(router.route).toEqual({ name: 'item', id: 'x' })
  })

  it('system back from a pushed page lands on home and the next back leaves', async () => {
    router.navigate({ name: 'settings' })
    b.systemBack(); await b.flush()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.left).toBe(false)
    b.systemBack(); await b.flush()
    expect(b.left).toBe(true)
  })

  it('home() from settings pops back instead of pushing (clear-all)', async () => {
    router.navigate({ name: 'settings' })
    router.home(); await b.flush()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.index).toBe(0)
    b.systemBack(); await b.flush()
    expect(b.left).toBe(true)
  })

  it('home() on a deep link replaces instead of leaving the app', async () => {
    await boot(new FakeBrowser('#/item/x'))
    expect(router.route).toEqual({ name: 'item', id: 'x' })
    router.home(); await b.flush()
    expect(b.left).toBe(false)
    expect(router.route).toEqual({ name: 'home' })
    expect(b.hashes()).toEqual(['#/'])
  })

  it('sheet marker keeps the depth; back closes the sheet, then goes home', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'edit-item', itemId: 'x' })
    expect(sheets.current).toEqual({ kind: 'edit-item', itemId: 'x' })
    expect(depthOf(b.top.state)).toBe(1)
    b.systemBack(); await b.flush()
    expect(sheets.current).toBeNull()
    expect(router.route).toEqual({ name: 'item', id: 'x' })
    b.systemBack(); await b.flush()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.left).toBe(false)
  })

  it('delete from the edit sheet: closeThen + home() twice (sheet and vanished-item effect) lands on home once', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'edit-item', itemId: 'x' })
    sheets.closeThen(async () => {
      await Promise.resolve()
      router.home() // the vanished-item effect
      await Promise.resolve()
      router.home() // EditItemSheet after deleteItem resolves
    })
    await b.flush()
    expect(sheets.current).toBeNull()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.index).toBe(0)
    expect(b.left).toBe(false)
    b.systemBack(); await b.flush()
    expect(b.left).toBe(true)
  })

  it('home() with a sheet still open closes it on the way home', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'backdate', itemId: 'x' })
    router.home()
    sheets.close() // e.g. the sheet noticing its item vanished, in the same tick
    await b.flush()
    expect(sheets.current).toBeNull()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.index).toBe(0)
    expect(b.left).toBe(false)
  })

  it('a sheet opened while the previous close is still popping stays open', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'edit-record', recordId: 'r1' })
    sheets.close()
    sheets.open({ kind: 'edit-record', recordId: 'r2' })
    await b.flush()
    expect(sheets.current).toEqual({ kind: 'edit-record', recordId: 'r2' })
    expect(b.entries).toHaveLength(3)
    b.systemBack(); await b.flush()
    expect(sheets.current).toBeNull()
    expect(router.route).toEqual({ name: 'item', id: 'x' })
  })
})

describe('sheet restore after reload / tab reclaim', () => {
  it('stores the sheet on its marker entry and restores it on start; back then closes it', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'edit-record', recordId: 'r1' })
    expect((b.top.state as Record<string, unknown>)['lasttime-sheet']).toEqual({ kind: 'edit-record', recordId: 'r1' })

    await boot(b.reload())
    expect(router.route).toEqual({ name: 'item', id: 'x' })
    expect(sheets.current).toEqual({ kind: 'edit-record', recordId: 'r1' })
    expect(b.index).toBe(2)

    b.systemBack(); await b.flush()
    expect(sheets.current).toBeNull()
    expect(router.route).toEqual({ name: 'item', id: 'x' })
    b.systemBack(); await b.flush()
    expect(router.route).toEqual({ name: 'home' })
    expect(b.left).toBe(false)
  })

  it('swapping the open sheet updates the marker, so reload restores the sheet actually shown', async () => {
    router.navigate({ name: 'item', id: 'x' })
    sheets.open({ kind: 'backdate', itemId: 'x' })
    sheets.open({ kind: 'edit-record', recordId: 'r9' })
    expect(b.entries).toHaveLength(3)
    await boot(b.reload())
    expect(sheets.current).toEqual({ kind: 'edit-record', recordId: 'r9' })
  })

  it('does not store an import backup in history; on reload the dead entry is dropped', async () => {
    router.navigate({ name: 'settings' })
    sheets.open({ kind: 'import', backup: { items: [], records: [] } as never })
    expect((b.top.state as Record<string, unknown>)['lasttime-sheet']).toBe(true)
    expect(depthOf(b.top.state)).toBe(1)

    await boot(b.reload())
    expect(sheets.current).toBeNull()
    expect(b.index).toBe(1)
    expect(router.route).toEqual({ name: 'settings' })
    b.systemBack(); await b.flush()
    expect(router.route).toEqual({ name: 'home' })
  })

  it('drops a marker that is not a usable sheet', async () => {
    await boot(new FakeBrowser('', null, [
      { state: null, hash: '#/' },
      { state: { depth: 0, 'lasttime-sheet': { kind: 'edit-item' } }, hash: '#/' },
    ], 1))
    expect(sheets.current).toBeNull()
    expect(b.index).toBe(0)
  })
})
