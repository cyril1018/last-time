import { normalizeName, sortItemsForHome } from './calc'
import type { Item } from './types'

export interface HomeView {
  /** Unarchived items in home order, filtered by the query (case-insensitive "name contains"). */
  visible: Item[]
  /** The item whose name equals the normalized query exactly, archived or not. */
  exact: Item | undefined
  /** Show the "＋ 新增 / 恢復" row: there is a query and no unarchived item has exactly that name. */
  showAdd: boolean
  /** Which label the add row uses; null when the row is hidden. */
  addLabelKind: 'add' | 'restore' | null
  /** Show the onboarding empty state: nothing unarchived to list and no query. */
  empty: boolean
  /** How many items are archived (hidden from home). */
  archivedCount: number
}

/** The home list for a search query (spec §7.1). A blank query lists everything and shows no add row. */
export function homeView(items: Item[], lastTs: Map<string, number>, query: string): HomeView {
  const sorted = sortItemsForHome(items, lastTs)
  const q = normalizeName(query)
  const archivedCount = items.length - sorted.length
  if (!q) return { visible: sorted, exact: undefined, showAdd: false, addLabelKind: null, empty: sorted.length === 0, archivedCount }
  const needle = q.toLowerCase()
  const visible = sorted.filter((i) => i.name.toLowerCase().includes(needle))
  const exact = items.find((i) => i.name === q)
  const showAdd = !exact || exact.archived
  return { visible, exact, showAdd, addLabelKind: showAdd ? (exact?.archived ? 'restore' : 'add') : null, empty: false, archivedCount }
}
