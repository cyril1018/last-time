import { createDb } from './db'
import { Store } from './store.svelte'

export const store = new Store(createDb())
