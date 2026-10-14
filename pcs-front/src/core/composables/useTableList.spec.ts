import { describe, expect, it, vi } from 'vitest'
import { useTableList } from './useTableList'

function makeFetch(items: Array<Record<string, unknown>> = []) {
  return vi
    .fn<(params: Record<string, unknown> & { page: number; pageSize: number }) => Promise<{ list: Array<Record<string, unknown>>; total: number }>>()
    .mockResolvedValue({ list: items, total: items.length })
}

describe('useTableList', () => {
  it('初始：列表空、loading false、默认分页', () => {
    const t = useTableList({ fetchFn: makeFetch([{ id: 1 }]) })
    expect(t.list.value).toEqual([])
    expect(t.loading.value).toBe(false)
    expect(t.pagination.current).toBe(1)
    expect(t.pagination.pageSize).toBe(20)
    expect(t.pagination.total).toBe(0)
  })

  it('defaultPageSize 覆盖默认分页尺寸', () => {
    const t = useTableList({ fetchFn: makeFetch(), defaultPageSize: 10 })
    expect(t.pagination.pageSize).toBe(10)
  })

  it('fetch 携带 queryParams+分页参数并更新列表与总数', async () => {
    const fetchFn = makeFetch([{ id: 1 }, { id: 2 }])
    const t = useTableList({ fetchFn })
    await t.fetch()
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }))
    expect(t.list.value).toHaveLength(2)
    expect(t.pagination.total).toBe(2)
    expect(t.loading.value).toBe(false)
  })

  it('search 重置到第一页并清空选择', async () => {
    const fetchFn = makeFetch([{ id: 1 }])
    const t = useTableList({ fetchFn })
    await t.fetch()
    t.onSelectionChange(['key-1'], [{ id: 1 }])
    t.pagination.current = 5
    await t.search()
    expect(t.pagination.current).toBe(1)
    expect(t.selectedRowKeys.value).toEqual([])
    expect(fetchFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('changePage 更新页码与分页尺寸', async () => {
    const fetchFn = makeFetch([{ id: 1 }])
    const t = useTableList({ fetchFn })
    await t.changePage(3, 50)
    expect(t.pagination.current).toBe(3)
    expect(t.pagination.pageSize).toBe(50)
    expect(fetchFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, pageSize: 50 }))
  })

  it('reset 复原 defaultQuery 并重新查询', async () => {
    const fetchFn = makeFetch([{ id: 1 }])
    const t = useTableList({ fetchFn, defaultQuery: { keyword: 'hi' } })
    ;(t.queryParams as Record<string, unknown>).keyword = 'changed'
    await t.reset()
    expect((t.queryParams as Record<string, unknown>).keyword).toBe('hi')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
