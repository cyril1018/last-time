export const ID_PATTERN = /^[0-9a-z]{13}$/

/** 13-char base36 id: time prefix + random tail. */
export function newId(now: number = Date.now(), rand: () => number = Math.random): string {
  const time = now.toString(36)
  let tail = ''
  while (time.length + tail.length < 13) {
    tail += Math.floor(rand() * 36).toString(36)
  }
  return (time + tail).slice(0, 13)
}

let lastT = 0

/**
 * Monotonic id for new rows: the time prefix is bumped by 1 ms whenever `now` does not move past the
 * previous id, so ids minted in the same millisecond never collide and sort (as strings) in creation order.
 * The bump keeps the 13-char format: only the time value changes, never its length (8 base36 chars until 2059).
 */
export function nextId(now: number = Date.now()): string {
  lastT = Math.max(now, lastT + 1)
  return newId(lastT)
}
