/**
 * 认证 mock 数据源（PermissionAccessManual2 v2 接入形态）
 *
 * BFF 未就绪时，template-core auth client 在 env.useMockAuth=true 下直接调用本文件，
 * 不发 fetch。BFF 就绪后置 useMockAuth=false，本文件不再被引用。
 *
 * 维护模块级 mockSessionState：mockLogin 写入、mockGetSession 读取、mockLogout 清除。
 * 与 manual v2 的 AuthSession / FrontendProfile 结构完全对齐，切真实 BFF 时调用方无感知。
 */

import type { RouteRecordRaw } from 'vue-router'
import { env } from '@core/config'
import { routes } from '@/router/routes'

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

/** M1 基础数据页面的权限码；真实 BFF 接入后由 /auth/frontend-profile 返回相同结构。 */
const MASTER_DATA_PERMISSION_KEYS = [
  'country', 'province', 'city', 'district', 'postal_code', 'airport', 'port', 'warehouse', 'airline',
  'transport_mode', 'cargo_type', 'packaging_type', 'supervision_mode', 'fee_item', 'currency', 'air_region',
  'air_region_country', 'exchange_rate', 'reference_zone', 'reference_zone_member',
]

/** 显式维护的操作权限码（read / write / 按钮级操作，在视图层声明，路由表收集不到）；
 *  页面与菜单资源已由路由表自动收集（见 MOCK_ALL_RESOURCE_IDS），新增页面无需改这里。 */
const MOCK_RESOURCE_IDS: string[] = [
  'menu:pcs.front.base_data',
  'operation:pcs.front.page.base_data',
  'operation:pcs.front.page.home',
  ...MASTER_DATA_PERMISSION_KEYS.flatMap((key) => [
    `operation:pcs.front.page.${key}`,
    `operation:pcs.front.${key}.read`,
    `operation:pcs.front.${key}.write`,
  ]),
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

/** 从路由表递归收集资源策略 resourceId（'public' / 'optional' / 'authenticated' 无资源，跳过），
 *  并包含 meta.masterDataReadPermission；新增页面/菜单后 mock 权限自动覆盖，无需手工补 ID。 */
function collectRouteResourceIds(routeList: RouteRecordRaw[]): string[] {
  const ids: string[] = []
  const walk = (records: RouteRecordRaw[]): void => {
    for (const record of records) {
      const auth = record.meta?.auth
      if (typeof auth === 'object' && auth !== null) ids.push(auth.resourceId)
      const readPermission = record.meta?.masterDataReadPermission
      if (readPermission) ids.push(readPermission)
      if (record.children?.length) walk(record.children)
    }
  }
  walk(routeList)
  return ids
}

/** mock 全量资源集合：路由表声明资源自动并入 + 上述显式操作码，去重。 */
const MOCK_ALL_RESOURCE_IDS: string[] = [
  ...new Set([...collectRouteResourceIds(routes), ...MOCK_RESOURCE_IDS]),
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
    resource_ids: [...MOCK_ALL_RESOURCE_IDS],
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
