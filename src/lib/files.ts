export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })
  } catch {
    return false
  }
}

/** unsupported: this device cannot share files at all. failed: it can, but this share was refused or broke. */
export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed'

export async function shareText(filename: string, text: string): Promise<ShareOutcome> {
  if (!canShareFiles()) return 'unsupported'
  const file = new File([text], filename, { type: 'application/json' })
  try {
    await navigator.share({ files: [file], title: filename })
    return 'shared'
  } catch (e) {
    // AbortError = user dismissed the share sheet. Anything else (NotAllowedError, DataError, …) is a failure.
    return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export function readFileText(file: File): Promise<string> {
  return file.text()
}
