import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 用户身份（结构对齐 PermissionAccessManual2 v2 Identity）。
 *
 * 不持有 accessToken / refreshToken：浏览器只存 HttpOnly Cookie，
 * 令牌由 BFF 在服务端管理，前端不可见。
 * CSRF Token 也不在 store：改存 JS 可读 cookie（见 @/utils/csrf），跨标签页共享 + 刷新页面保留。
 */
export interface UserInfo {
  /** 用户主体标识（如 user:<id>） */
  subject: string
  /** 展示名，优先用于顶栏等用户可见位置 */
  display_name?: string
  /** 登录账号名 */
  username?: string
  /** 最近一次认证时间（ISO 字符串） */
  authenticated_at?: string
}

/**
 * 用户态全局状态：仅身份信息。
 *
 * 数据来源：路由守卫每次调 getSession() 后同步写入。
 * CSRF Token：见 @/utils/csrf，存 cookie 不存 store。
 * 安全红线：不保存任何 Token；userInfo 仅存内存（Pinia state），
 * 禁止落 localStorage / sessionStorage。
 */
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => Boolean(userInfo.value))

  /** 路由守卫在 getSession() 返回 authenticated 后同步身份。 */
  function setUserInfo(info: UserInfo): void {
    userInfo.value = info
  }

  function logout(): void {
    userInfo.value = null
  }

  return {
    userInfo,
    isLoggedIn,
    setUserInfo,
    logout,
  }
})
