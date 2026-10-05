/** Last row per id wins, in order of first appearance; the same outcome as a bulkPut of the list. */
export function dedupeById<T extends { id: string }>(xs: readonly T[]): T[] {
  return [...new Map(xs.map((x) => [x.id, x] as const)).values()]
}
