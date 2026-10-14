import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePermissionStore } from './permission'

function makeProfile() {
  return {
    subject: 'user:1',
    systemCode: 'demo',
    environment: 'test',
    permissionVersion: 'v1',
    resourceIds: ['page:view'],
    ttlSeconds: 60,
  }
}

describe('permission store state boundary', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('只通过快照更新权限状态', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.loaded).toBe(true)
    expect(store.can('page:view')).toBe(true)
  })

  it('显式维护 loading 和错误状态', () => {
    const store = usePermissionStore()
    const error = new Error('load failed')
    store.setLoading(true)
    expect(store.loading).toBe(true)
    store.setError(error)
    expect(store.loaded).toBe(false)
    expect(store.lastError).toBe(error)
    store.setLoading(false)
    expect(store.loading).toBe(false)
  })

  it('clear 清空身份与权限快照', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    store.clear()
    expect(store.loaded).toBe(false)
    expect(store.resourceIds).toEqual([])
    expect(store.subject).toBe('')
  })

  it('can 对空串 / undefined 视为不限制，返回 true', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.can()).toBe(true)
    expect(store.can('')).toBe(true)
  })

  it('can 对不在快照中的资源返回 false', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.can('no:such-page')).toBe(false)
  })

  it('canAny 空数组视为不限制，返回 true', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.canAny([])).toBe(true)
  })

  it('canAny 存在任一匹配返回 true', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.canAny(['page:view'])).toBe(true)
    expect(store.canAny(['no:such', 'page:view'])).toBe(true)
    // 含空串元素时 can 视为不限制，应命中
    expect(store.canAny(['no:such', ''])).toBe(true)
  })

  it('canAny 全部不匹配返回 false', () => {
    const store = usePermissionStore()
    store.applyProfile(makeProfile())
    expect(store.canAny(['no:such'])).toBe(false)
  })
})
