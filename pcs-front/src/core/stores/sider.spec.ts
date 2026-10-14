import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSiderStore } from './sider'

describe('sider store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始：桌面未折叠、抽屉隐藏', () => {
    const store = useSiderStore()
    expect(store.siderCollapsed).toBe(false)
    expect(store.siderDrawerVisible).toBe(false)
  })

  it('toggleSider 来回切换折叠态', () => {
    const store = useSiderStore()
    store.toggleSider()
    expect(store.siderCollapsed).toBe(true)
    store.toggleSider()
    expect(store.siderCollapsed).toBe(false)
  })

  it('setSiderCollapsed 显式设置折叠态', () => {
    const store = useSiderStore()
    store.setSiderCollapsed(true)
    expect(store.siderCollapsed).toBe(true)
    store.setSiderCollapsed(false)
    expect(store.siderCollapsed).toBe(false)
  })

  it('open/closeSiderDrawer 控制抽屉开合', () => {
    const store = useSiderStore()
    store.openSiderDrawer()
    expect(store.siderDrawerVisible).toBe(true)
    store.closeSiderDrawer()
    expect(store.siderDrawerVisible).toBe(false)
  })
})
