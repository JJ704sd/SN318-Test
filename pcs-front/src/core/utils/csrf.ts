/**
 * CSRF Token cookie 工具（PermissionAccessManual2 v2）
 *
 * BFF 在 /auth/session 响应体里返回 csrf_token，前端写入 JS 可读 cookie（非 HttpOnly）。
 * 写业务接口时从 cookie 读取，注入 X-CSRF-Token 头，BFF 校验 header 与 session 内副本一致。
 *
 * 这是 double-submit cookie 模式：BFF HttpOnly Cookie 守 session 凭证，
 * JS 可读 cookie + 自定义 header 守 CSRF。XSS 仍能读 cookie，但 CSRF 不能跨站读 cookie。
 *
 * 不存 localStorage/sessionStorage：CSRF Token 需随 session 同步刷新，
 * cookie 用 session 模式（不设 Max-Age）随浏览器关闭自动清，与 HttpOnly Session Cookie 生命周期对齐。
 */

const CSRF_COOKIE_NAME = 'csrf-token'

/** 读取 cookie 中的 CSRF Token（JS 可读，非 HttpOnly）。未找到返回空串。 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

/** 写入 CSRF Token 到 cookie（同源、JS 可读、SameSite=Lax）。
 *  Secure 按 protocol 动态判断：https 设（生产），http 不设（dev）。 */
export function setCsrfToken(token: string): void {
  if (typeof document === 'undefined' || !token) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/${secure}; SameSite=Lax`
}

/** 清除 CSRF Token cookie（退出登录 / session 失效时调用）。 */
export function clearCsrfToken(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}
