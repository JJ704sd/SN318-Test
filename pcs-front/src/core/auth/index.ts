/**
 * Auth 领域入口：@core/auth
 *
 * 会话、认证与跨标签认证事件，以及 CSRF cookie 读写（会话安全相关）。
 * 依赖方向：可依赖 api/utils 之上的 config；【不】依赖任何 UI 组件。
 */
export {
  getSession,
  login,
  logout,
  getFrontendProfile,
  refreshCsrfToken,
  useMockAuth,
  loginWithMockUser,
  registerAuthMocks,
  BffError,
} from './auth-client'
export type { AuthMocks, AuthSession, FrontendProfile, FrontendResource } from './auth-client'
export {
  initAuthEvents,
  subscribeAuthEvents,
  broadcastAuthEvent,
  destroyAuthEvents,
} from './auth-events'
export type { AuthEvent, AuthEventType } from './auth-events'
export { getCsrfToken, setCsrfToken, clearCsrfToken } from '@core/utils/csrf'
