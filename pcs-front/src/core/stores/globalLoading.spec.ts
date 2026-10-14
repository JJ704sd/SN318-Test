import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGlobalLoadingStore } from './globalLoading'

describe('global-loading store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('默认未加载', () => {
    const store = useGlobalLoadingStore()
    expect(store.globalLoading).toBe(false)
  })

  it('setGlobalLoading 同步更新加载态', () => {
    const store = useGlobalLoadingStore()
    store.setGlobalLoading(true)
    expect(store.globalLoading).toBe(true)
    store.setGlobalLoading(false)
    expect(store.globalLoading).toBe(false)
  })
})
