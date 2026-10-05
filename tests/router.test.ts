import { describe, it, expect } from 'vitest'
import { parseHash, routeToHash } from '../src/lib/router.svelte'

describe('router', () => {
  it.each([
    ['', { name: 'home' }],
    ['#', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/item/abc123', { name: 'item', id: 'abc123' }],
    ['#/item/', { name: 'home' }],
    ['#/settings', { name: 'settings' }],
    ['#/whatever', { name: 'home' }],
    ['#/item/%', { name: 'home' }],
    ['#/item/%E0%A4%A', { name: 'home' }],
    ['#/item/%E4%B8%8A', { name: 'item', id: '上' }],
  ])('parseHash(%j)', (hash, route) => {
    expect(parseHash(hash)).toEqual(route)
  })
  it('routeToHash inverts parseHash', () => {
    expect(routeToHash({ name: 'home' })).toBe('#/')
    expect(routeToHash({ name: 'item', id: 'x' })).toBe('#/item/x')
    expect(routeToHash({ name: 'settings' })).toBe('#/settings')
  })
})
