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
