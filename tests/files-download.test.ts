// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { downloadText } from '../src/lib/files'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('downloadText', () => {
  it('clicks a detached-after-use anchor with the download name, then revokes the object URL', async () => {
    vi.useFakeTimers()
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clicked: { download: string; href: string; inDocument: boolean }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href, inDocument: document.body.contains(this) })
    })

    downloadText('上次備份-2026-10-05.json', '{"a":1}')

    expect(create).toHaveBeenCalledTimes(1)
    const blob = create.mock.calls[0]![0] as Blob
    expect(blob.type).toBe('application/json')
    expect(await blob.text()).toBe('{"a":1}')
    expect(clicked).toEqual([{ download: '上次備份-2026-10-05.json', href: 'blob:fake-url', inDocument: true }])
    expect(document.querySelector('a')).toBeNull()

    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:fake-url')
  })
})
