import { describe, it, expect, afterEach, vi } from 'vitest'
import { canShareFiles, shareText, readFileText } from '../src/lib/files'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('files', () => {
  it('canShareFiles is false when navigator.share is missing', () => {
    vi.stubGlobal('navigator', {})
    expect(canShareFiles()).toBe(false)
  })

  it('canShareFiles is false when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined)
    expect(canShareFiles()).toBe(false)
  })

  it('canShareFiles is false when canShare throws', () => {
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => { throw new Error('nope') } })
    expect(canShareFiles()).toBe(false)
  })

  it('shareText returns unsupported without Web Share', async () => {
    vi.stubGlobal('navigator', {})
    expect(await shareText('a.json', '{}')).toBe('unsupported')
  })

  it('shareText returns shared on success and passes a file', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    expect(await shareText('a.json', '{}')).toBe('shared')
    const arg = share.mock.calls[0]![0] as { files: File[] }
    expect(arg.files[0]!.name).toBe('a.json')
  })

  it('shareText returns cancelled on AbortError', async () => {
    const err = Object.assign(new Error('abort'), { name: 'AbortError' })
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(err), canShare: () => true })
    expect(await shareText('a.json', '{}')).toBe('cancelled')
  })

  it('shareText returns unsupported when files cannot be shared', async () => {
    const share = vi.fn()
    vi.stubGlobal('navigator', { share, canShare: () => false })
    expect(await shareText('a.json', '{}')).toBe('unsupported')
    expect(share).not.toHaveBeenCalled()
  })

  it.each(['NotAllowedError', 'DataError', 'TypeError'])('shareText returns failed when share rejects with %s', async (name) => {
    const err = Object.assign(new Error('x'), { name })
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(err), canShare: () => true })
    expect(await shareText('a.json', '{}')).toBe('failed')
  })

  it('shareText returns failed when share rejects with a non-error value', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(undefined), canShare: () => true })
    expect(await shareText('a.json', '{}')).toBe('failed')
  })

  it('readFileText reads file contents', async () => {
    expect(await readFileText(new File(['hello'], 'a.json'))).toBe('hello')
  })
})
