import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'

function makeInfo() {
  return { subject: 'user:1', display_name: '张三', username: 'zhangsan' }
}

describe('user store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始未登录', () => {
    const store = useUserStore()
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('setUserInfo 设置身份并置登录态', () => {
    const store = useUserStore()
    store.setUserInfo(makeInfo())
    expect(store.userInfo).toEqual(makeInfo())
    expect(store.isLoggedIn).toBe(true)
  })

  it('logout 清空身份并登出', () => {
    const store = useUserStore()
    store.setUserInfo(makeInfo())
    store.logout()
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })
})
