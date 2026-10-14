import { describe, expect, it, vi } from 'vitest'
import { useDetail } from './useDetail'

describe('useDetail', () => {
  it('初始：detail 空、loading false、error false', () => {
    const d = useDetail({ fetchFn: vi.fn<(id: string) => Promise<Record<string, unknown>>>() })
    expect(d.detail.value).toBeNull()
    expect(d.loading.value).toBe(false)
    expect(d.error.value).toBe(false)
  })

  it('load 成功填充 detail', async () => {
    const d = useDetail({ fetchFn: vi.fn<(id: string) => Promise<Record<string, unknown>>>().mockResolvedValue({ id: '1' }) })
    await d.load('1')
    expect(d.detail.value).toEqual({ id: '1' })
    expect(d.loading.value).toBe(false)
    expect(d.error.value).toBe(false)
  })

  it('load 失败清空 detail 并置 error', async () => {
    const d = useDetail({ fetchFn: vi.fn<(id: string) => Promise<Record<string, unknown>>>().mockRejectedValue(new Error('fetch 失败')) })
    await d.load('1')
    expect(d.detail.value).toBeNull()
    expect(d.error.value).toBe(true)
    expect(d.loading.value).toBe(false)
  })

  it('load 期间 loading 为 true', async () => {
    let resolveFn!: (v: { id: string }) => void
    const d = useDetail({ fetchFn: vi.fn<(id: string) => Promise<Record<string, unknown>>>(() => new Promise((r) => { resolveFn = r })) })
    const p = d.load('1')
    expect(d.loading.value).toBe(true)
    resolveFn({ id: '1' })
    await p
    expect(d.loading.value).toBe(false)
  })

  it('clear 清空 detail/loading/error', async () => {
    const d = useDetail({ fetchFn: vi.fn<(id: string) => Promise<Record<string, unknown>>>().mockResolvedValue({ id: '1' }) })
    await d.load('1')
    d.clear()
    expect(d.detail.value).toBeNull()
    expect(d.loading.value).toBe(false)
    expect(d.error.value).toBe(false)
  })
})
