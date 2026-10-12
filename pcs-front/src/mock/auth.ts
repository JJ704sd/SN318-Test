/**
 * 认证 mock 数据源（PermissionAccessManual2 v2 接入形态）
 *
 * BFF 未就绪时，src/auth/auth-client.ts 在 env.useMockAuth=true 下直接调用本文件，
 * 不发 fetch。BFF 就绪后置 useMockAuth=false，本文件不再被引用。
 *
 * 维护模块级 mockSessionState：mockLogin 写入、mockGetSession 读取、mockLogout 清除。
 * 与 manual v2 的 AuthSession / FrontendProfile 结构完全对齐，切真实 BFF 时调用方无感知。
 */

import { env } from '@baiyun/template-core/config'

/** 模拟网络延迟（ms）。 */
const MOCK_DELAY = 150

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** mock 用户身份（结构对齐 manual v2 Identity）。 */
interface MockIdentity {
  subject: string
  display_name?: string
  username?: string
  authenticated_at: string
}

/** mock 会话状态（结构对齐 manual v2 AuthSession 的 authenticated 分支）。 */
interface MockSessionState {
  authenticated: true
  identity: MockIdentity
  csrf_token: string
}

/** 模块级 mock 会话：未登录为 null，mockLogin 后写入。 */
let mockSession: MockSessionState | null = null

/** mock 权限码集合：与 docs/permission-resources.md 资源清单保持一致。
 *  真实 BFF 接入后由 /auth/frontend-profile 返回相同结构。 */
const MOCK_RESOURCE_IDS: string[] = [
  'menu:frontend_demo.home',
  'menu:frontend_demo.demo',
  'operation:frontend_demo.page.home',
  'operation:frontend_demo.page.demo_list',
  'operation:frontend_demo.page.demo_detail',
  'operation:frontend_demo.page.demo_form',
  'operation:frontend_demo.page.demo_dashboard',
  'operation:frontend_demo.page.demo_components',
  'operation:frontend_demo.demo.import',
  'operation:frontend_demo.demo.create',
  'operation:frontend_demo.demo.export',
  'operation:frontend_demo.demo.batch_delete',
  'operation:frontend_demo.demo.batch_enable',
  'operation:frontend_demo.demo.print',
  'operation:frontend_demo.demo.view_detail',
  'operation:frontend_demo.demo.view_trace',
  'operation:frontend_demo.demo.edit',
  'operation:frontend_demo.demo.save',
]

/** 生成 mock CSRF Token：base64 编码随机数，模拟 BFF 下发的不可预测串。 */
function genCsrfToken(): string {
  const seed = `${Date.now()}.${Math.random().toString(36).slice(2, 10)}`
  return `mock-csrf-${btoa(seed)}`
}

/** mock 会话查询：未登录返回 { authenticated: false }，已登录返回完整 session。
 *  模拟 BFF 端 token 轮换：每次 getSession 生成新 csrf_token，更接近真实行为，
 *  避免掩盖 CSRF 失效相关 bug（如 403 自动恢复逻辑）。 */
export function mockGetSession(): Promise<unknown> {
  if (!mockSession) {
    return delay({ authenticated: false })
  }
  mockSession = { ...mockSession, csrf_token: genCsrfToken() }
  return delay({ ...mockSession })
}

/** mock 登录：任意非空用户名 + 非空密码通过；写入 mockSession 并返回完整 session。 */
export async function mockLogin(username: string, _password: string): Promise<unknown> {
  const identity: MockIdentity = {
    subject: `user:${username}`,
    display_name: username,
    username,
    authenticated_at: new Date().toISOString(),
  }
  mockSession = {
    authenticated: true,
    identity,
    csrf_token: genCsrfToken(),
  }
  await delay(null)
  return { ...mockSession }
}

/** mock 权限画像：返回当前 mockSession.identity 对应的 resource_ids 集合。 */
export function mockGetFrontendProfile(): Promise<unknown> {
  const subject = mockSession?.identity.subject ?? ''
  // mock 环境标识：开发模式读 import.meta.env.MODE，生产写死 prod
  const environment = import.meta.env.MODE === 'production' ? 'prod' : 'dev'
  return delay({
    subject,
    system_code: env.permissionSystemCode,
    environment,
    permission_version: env.permissionVersion,
    menus: [],
    pages: [],
    operations: [],
    modules: [],
    resource_ids: [...MOCK_RESOURCE_IDS],
    ttl_seconds: 60,
  })
}

/** mock 退出：清 mockSession。scope 参数仅为对齐 manual v2 签名，mock 阶段无差异。 */
export async function mockLogout(_scope: 'application' | 'sso'): Promise<{
  logged_out: boolean
  sso_redirect?: string
}> {
  mockSession = null
  await delay(null)
  return { logged_out: true }
}

/** 同步判断 mock 是否已登录：供路由守卫在非异步路径下快速分流。 */
export function mockIsAuthenticated(): boolean {
  return Boolean(mockSession)
}
