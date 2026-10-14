/**
 * 认证客户端（PermissionAccessManual2 v2 无 SDK 接入形态）
 *
 * 浏览器只持 HttpOnly Session Cookie，不发 Authorization、不自构造 X-Auth-Subject。
 * 所有认证/权限跨域直连 BFF /auth/*：getSession / login / getFrontendProfile / logout。
 *
 * env.useMockAuth=true 时（BFF 未就绪），request<T> 不发 fetch，直接调用 src/mock/auth.ts
 * 的 mock 函数返回假数据。BFF 就绪后置 useMockAuth=false，无需改业务代码即可切真实接口。
 */

import { env } from '@core/config/env'
import { clearCsrfToken, setCsrfToken } from '@core/utils/csrf'

/**
 * 业务层可注册的 mock 认证实现（mock 留业务层，不进包）。
 * 业务项目在 main.ts 调用 registerAuthMocks({ mockGetSession, mockGetFrontendProfile, mockLogout })，从 @/mock/auth import。
 */
export interface AuthMocks {
  mockGetSession(): Promise<unknown>
  mockGetFrontendProfile(): Promise<unknown>
  mockLogout(scope: 'application' | 'sso'): Promise<unknown>
  mockLogin?(username: string, password: string): Promise<unknown>
  mockIsAuthenticated?(): boolean
}

let authMocks: AuthMocks | null = null

export function registerAuthMocks(mocks: AuthMocks): void {
  authMocks = mocks
}

/** BFF 基址：env.bffHost + '/auth'。函数形式保证 loadConfig 后取最新值（顶层 const 会在 loadConfig 之前求值，拿到空 bffHost） */
function authBase(): string {
  return env.bffHost + '/auth'
}

type Identity = {
  subject: string
  display_name?: string
  username?: string
  authenticated_at: string
}

export type AuthSession =
  | { authenticated: false }
  | {
      authenticated: true
      identity: Identity
      csrf_token: string
    }

export type FrontendResource = {
  resource_id: string
  version: string
  resource_type: string
  system_code: string
  name: string
  parent_resource_id?: string
  route_path?: string
  sort_no: number
  risk_level: string
  metadata_json: Record<string, unknown>
  enabled: boolean
}

export type FrontendProfile = {
  subject: string
  system_code: string
  environment: string
  permission_version: string
  menus: FrontendResource[]
  pages: FrontendResource[]
  operations: FrontendResource[]
  modules: FrontendResource[]
  resource_ids: string[]
  ttl_seconds: number
}

type BffEnvelope<T> = {
  contract_version: 1
  code: number
  message: string
  data: T | null
  trace_id: string
}

export class BffError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number,
    readonly traceId: string,
  ) {
    super(message)
  }
}

/** mock 模式路由分流：返回 true 表示当前走 mock，调用方据此跳前端 /login 而非调 login()。 */
export function useMockAuth(): boolean {
  return env.useMockAuth
}

/** BFF /auth/* 请求：真实模式跨域 fetch + 信封解包；mock 模式直接调 mock 函数。 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (env.useMockAuth) {
    return mockRequest<T>(path, init) as Promise<T>
  }

  let response: Response
  try {
    response = await fetch(`${authBase()}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    })
  } catch {
    throw new BffError('认证服务暂时不可用', 503, 100007, '')
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw new BffError('服务返回格式错误', response.status, 100999, '')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BffError('服务返回格式错误', response.status, 100999, '')
  }
  const envelope = parsed as BffEnvelope<T>

  if (
    envelope.contract_version !== 1 ||
    !response.ok ||
    envelope.code !== 0 ||
    envelope.data === null
  ) {
    throw new BffError(
      envelope.message || '认证请求失败',
      response.status,
      envelope.code,
      envelope.trace_id,
    )
  }

  return envelope.data
}

/** mock 分支请求分发：按 path + method 路由到对应 mock 函数。 */
function mockRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!authMocks) {
    console.error('mock 认证已开启但未注册 mock 函数：请在 main.ts 调用 registerAuthMocks({ mockGetSession, mockGetFrontendProfile, mockLogout })')
    return Promise.reject(new BffError('mock 认证未注册', 500, 100999, ''))
  }
  const method = (init.method ?? 'GET').toUpperCase()
  const cleanPath = path.split('?')[0]

  if (cleanPath === '/session' && method === 'GET') {
    return authMocks.mockGetSession() as Promise<T>
  }
  if (cleanPath === '/login' && method === 'POST') {
    const { username, password } = parseBodyCredentials(init.body)
    if (!authMocks.mockLogin) {
      return Promise.reject(new BffError('mock 登录未注册：请在 main.ts 注册 mockLogin', 500, 100999, ''))
    }
    return authMocks.mockLogin(username, password) as Promise<T>
  }
  if (cleanPath === '/frontend-profile' && method === 'GET') {
    return authMocks.mockGetFrontendProfile() as Promise<T>
  }
  if (cleanPath === '/logout' && method === 'POST') {
    const scope = parseBodyScope(init.body)
    return authMocks.mockLogout(scope) as Promise<T>
  }
  return Promise.reject(new BffError(`mock 未实现：${method} ${cleanPath}`, 404, 100999, ''))
}

/** 从请求 body 解析 logout scope；解析失败回落 'application'。 */
function parseBodyScope(body: BodyInit | null | undefined): 'application' | 'sso' {
  if (typeof body !== 'string') return 'application'
  try {
    const parsed = JSON.parse(body) as { scope?: unknown }
    return parsed.scope === 'sso' ? 'sso' : 'application'
  } catch {
    return 'application'
  }
}

/** 从请求 body 解析登录凭据；缺失/解析失败回落 demo 身份（mock 登录不校验密码）。 */
function parseBodyCredentials(body: BodyInit | null | undefined): { username: string; password: string } {
  if (typeof body !== 'string') return { username: 'demo', password: '' }
  try {
    const parsed = JSON.parse(body) as { username?: unknown; password?: unknown }
    return {
      username: typeof parsed.username === 'string' && parsed.username ? parsed.username : 'demo',
      password: typeof parsed.password === 'string' ? parsed.password : '',
    }
  } catch {
    return { username: 'demo', password: '' }
  }
}

/** session 缓存 TTL（ms）：并发 getSession 在窗口期内复用同一 promise，避免重复 fetch。 */
const SESSION_CACHE_TTL_MS = 30_000

/** 进行中或已完成的 session 请求缓存；force=true 或过期后绕过。 */
let sessionCache: { promise: Promise<AuthSession>; expiresAt: number } | null = null

/**
 * 查询当前登录态 + CSRF Token。
 *
 * force=true 强制刷新（绕过缓存）；force=false 时 30s 内复用上一次结果，
 * 并发调用共享同一 promise，避免路由守卫 + 组件 + AppHeader 同时触发多次 fetch。
 * 失败时清缓存，下次调用重新请求。
 */
export function getSession(force = false): Promise<AuthSession> {
  if (!force && sessionCache && Date.now() < sessionCache.expiresAt) {
    return sessionCache.promise
  }
  const promise = request<AuthSession>(force ? '/session?force=1' : '/session')
  sessionCache = {
    promise,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  }
  // 失败清缓存：下次调用重新请求，避免缓存住一个 reject 的 promise
  promise.catch(() => {
    if (sessionCache?.promise === promise) sessionCache = null
  })
  return promise
}

/**
 * 刷新 CSRF Token cookie：调 getSession(true) 拿最新 token 写 cookie。
 * 写请求 403 时被动调用（CSRF 可能已轮换），不重试当前请求避免重复提交。
 * 刷新失败静默处理：下次请求仍会 403，由调用方按权限不足处理。
 */
export async function refreshCsrfToken(): Promise<void> {
  try {
    const session = await getSession(true)
    if (session.authenticated) {
      setCsrfToken(session.csrf_token)
    }
  } catch {
    // 静默：刷新失败不影响主流程
  }
}

/**
 * 跳转统一登录页（真实模式）。
 *
 * 真实模式：清前端 CSRF cookie（避免整页跳前的窗口期被利用）-> window.location.assign('/auth/login?return_to=...')，整页跳 BFF。
 * mock 模式：不应调用本函数，由路由守卫直接 router.push('/login?redirect=...')。
 *
 * return_to 必须是当前应用内以 / 开头的相对路径，不能传完整 URL。
 * forceLogin=true 用于切换账号或要求用户重新认证。
 */
export function login(returnTo = currentReturnTo(), forceLogin = false): void {
  // 清 CSRF cookie：整页跳前避免残留旧 token；BFF 回跳后路由守卫重新 getSession 写新 token
  clearCsrfToken()
  if (env.useMockAuth) {
    // mock 模式由调用方（路由守卫）处理跳转，本函数不应被调用；保留守卫以防误用
    return
  }
  const query = new URLSearchParams({ return_to: returnTo })
  if (forceLogin) query.set('force', '1')
  window.location.assign(`${authBase()}/login?${query.toString()}`)
}

/** 拉取当前用户前端权限画像。force=true 时强制刷新。 */
export async function getFrontendProfile(force = false): Promise<FrontendProfile> {
  return request<FrontendProfile>(
    force ? '/frontend-profile?force=1' : '/frontend-profile',
  )
}

/**
 * mock 模式专用登录：以给定用户名建立 mock 会话（任意非空用户名即通过，默认 demo）。
 * 真实模式无密码登录端点（登录走认证中台跳转/浮层），调用会抛错。
 */
export async function loginWithMockUser(username = 'demo'): Promise<AuthSession> {
  if (!env.useMockAuth) {
    throw new BffError('真实模式不支持密码登录', 400, 100999, '')
  }
  return request<AuthSession>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'mock' }),
  })
}

/**
 * 退出当前应用或统一 SSO。
 * - scope='application'：只退出当前业务系统，BFF 清 Cookie 但保留 SSO 会话
 * - scope='sso'：同时退出统一登录状态，会跳转 sso_redirect 完成全站登出
 */
export async function logout(scope: 'application' | 'sso' = 'application') {
  if (env.useMockAuth) {
    await authMocks?.mockLogout(scope)
    return
  }

  const session = await getSession(true)
  if (!session.authenticated) return

  const result = await request<{
    logged_out: boolean
    sso_redirect?: string
  }>('/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': session.csrf_token,
    },
    body: JSON.stringify({ scope }),
  })

  if (scope === 'sso') {
    if (!result.sso_redirect) {
      throw new BffError('缺少统一退出地址', 500, 100999, '')
    }
    const target = new URL(result.sso_redirect)
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new BffError('统一退出地址不合法', 500, 100999, '')
    }
    window.location.assign(target.toString())
  }
}

/** 当前相对路径（path + search + hash），作为 return_to 默认值。 */
function currentReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}
