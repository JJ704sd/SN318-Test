import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as AuthTypes from './auth-client'

// 可变 env mock：run 用例内切换 useMockAuth/bffHost（auth-client 运行时实时读）。
const { mockEnv, mockAuthMocks, setCsrfTokenMock, clearCsrfTokenMock } = vi.hoisted(() => {
  const mockEnv = { useMockAuth: false as boolean, bffHost: '' as string }
  const mockAuthMocks = {
    mockGetSession: vi.fn<() => Promise<unknown>>(),
    mockGetFrontendProfile: vi.fn<() => Promise<unknown>>(),
    mockLogout: vi.fn<(scope: 'application' | 'sso') => Promise<unknown>>(),
  }
  return {
    mockEnv,
    mockAuthMocks,
    setCsrfTokenMock: vi.fn<(token: string) => void>(),
    clearCsrfTokenMock: vi.fn<() => void>(),
  }
})
vi.mock('@core/config/env', () => ({ env: mockEnv }))
vi.mock('@core/utils/csrf', () => ({
  getCsrfToken: vi.fn<() => string>(),
  setCsrfToken: setCsrfTokenMock,
  clearCsrfToken: clearCsrfTokenMock,
}))

type FetchImpl = (input: RequestInfo | URL, init: RequestInit) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn>
// 每用例重置模块，清掉 auth-client 模块级 sessionCache/authMocks，避免用例串扰。
let auth: typeof AuthTypes

function stubFetch(impl: FetchImpl): void {
  fetchMock = vi.fn<FetchImpl>(impl)
  vi.stubGlobal('fetch', fetchMock)
}
/** 构造 BFF 信封响应。 */
function envelope<T>(
  data: T,
  o: { status?: number; code?: number; message?: string; contractVersion?: number } = {},
): Response {
  return new Response(
    JSON.stringify({ contract_version: o.contractVersion ?? 1, code: o.code ?? 0, message: o.message ?? 'ok', data, trace_id: 'trace-1' }),
    { status: o.status ?? 200 },
  )
}
function authedSession() {
  return {
    authenticated: true,
    identity: { subject: 'user:1', display_name: '张三', authenticated_at: '2026-09-16T01:00:00Z' },
    csrf_token: 'csrf-abc',
  }
}
/** jsdom 的 location.assign 不可单点重定义，整体替换 window.location 拦跳转。 */
function stubAssign(): ReturnType<typeof vi.fn> {
  const mock = vi.fn<(url: string | URL) => void>(() => {})
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { assign: mock, pathname: '/', search: '', hash: '' },
  })
  return mock
}

beforeEach(async () => {
  vi.resetModules()
  auth = await import('./auth-client')
  mockEnv.useMockAuth = false
  mockEnv.bffHost = ''
  setCsrfTokenMock.mockReset()
  clearCsrfTokenMock.mockReset()
  Object.values(mockAuthMocks).forEach((m) => m.mockReset())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useMockAuth / registerAuthMocks', () => {
  it('useMockAuth 反映 env.useMockAuth 实时值', () => {
    expect(auth.useMockAuth()).toBe(false)
    mockEnv.useMockAuth = true
    expect(auth.useMockAuth()).toBe(true)
  })
  it('registerAuthMocks 后 mock 分支可调 mockGetSession', async () => {
    mockEnv.useMockAuth = true
    auth.registerAuthMocks(mockAuthMocks)
    mockAuthMocks.mockGetSession.mockResolvedValue({ authenticated: false })
    await expect(auth.getSession()).resolves.toEqual({ authenticated: false })
    expect(mockAuthMocks.mockGetSession).toHaveBeenCalledOnce()
  })
  it('mock 开启未注册 → reject BffError(mock 认证未注册)', async () => {
    mockEnv.useMockAuth = true
    await expect(auth.getSession()).rejects.toMatchObject({ message: 'mock 认证未注册', status: 500, code: 100999 })
  })
})

describe('getSession（真实模式）', () => {
  it('未登录会话：fetch 返回 authenticated:false', async () => {
    stubFetch(async () => envelope({ authenticated: false }))
    await expect(auth.getSession()).resolves.toEqual({ authenticated: false })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it('已登录会话：返回 identity + csrf_token，注入 credentials + Accept 头', async () => {
    let capturedInit: RequestInit | undefined
    stubFetch(async (_url, init) => {
      capturedInit = init
      return envelope(authedSession())
    })
    const session = await auth.getSession()
    expect(session.authenticated).toBe(true)
    expect(capturedInit!.credentials).toBe('include')
    expect((capturedInit!.headers as Record<string, string>).Accept).toBe('application/json')
  })
  it('并发去重：30s 窗口内复用同一 promise，仅 fetch 一次', async () => {
    let calls = 0
    stubFetch(async () => {
      calls += 1
      return envelope({ authenticated: false })
    })
    const [a, b] = await Promise.all([auth.getSession(), auth.getSession()])
    expect(a).toEqual({ authenticated: false })
    expect(b).toEqual({ authenticated: false })
    expect(calls).toBe(1)
  })
  it('force=true 强制绕缓存：再次 fetch', async () => {
    let calls = 0
    stubFetch(async () => {
      calls += 1
      return envelope({ authenticated: false })
    })
    await auth.getSession()
    await auth.getSession(true)
    expect(calls).toBe(2)
  })
  it('data===null → 抛 BffError 认证请求失败', async () => {
    stubFetch(async () => envelope(null, { code: 100404, message: '登录态不存在', status: 200 }))
    await expect(auth.getSession()).rejects.toMatchObject({ message: '登录态不存在', code: 100404, traceId: 'trace-1' })
  })
  it('非 2xx + code 非 0 → 抛 BffError 带 code/message/status', async () => {
    stubFetch(async () => envelope(null, { code: 100007, message: '服务错误', status: 503 }))
    await expect(auth.getSession()).rejects.toMatchObject({ message: '服务错误', status: 503, code: 100007 })
  })
  it('contract_version !== 1 → 抛格式错误信封', async () => {
    stubFetch(async () => envelope({ authenticated: false }, { contractVersion: 2, status: 200 }))
    await expect(auth.getSession()).rejects.toBeInstanceOf(auth.BffError)
  })
  it('响应非 JSON → 抛服务返回格式错误', async () => {
    stubFetch(async () => new Response('<html>', { status: 200 }))
    await expect(auth.getSession()).rejects.toMatchObject({ message: '服务返回格式错误', code: 100999 })
  })
  it('JSON 合法但非对象（数组）→ 抛服务返回格式错误', async () => {
    stubFetch(async () => new Response('[1,2,3]', { status: 200 }))
    await expect(auth.getSession()).rejects.toMatchObject({ message: '服务返回格式错误', code: 100999 })
  })
  it('fetch reject（断网）→ 抛 503 认证服务暂时不可用', async () => {
    stubFetch(async () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(auth.getSession()).rejects.toMatchObject({ message: '认证服务暂时不可用', status: 503 })
  })
  it('失败后清缓存：下次调用重新请求', async () => {
    let calls = 0
    stubFetch(async () => {
      calls += 1
      if (calls === 1) return envelope(null, { status: 500 })
      return envelope({ authenticated: false })
    })
    await expect(auth.getSession()).rejects.toBeInstanceOf(Error)
    await expect(auth.getSession()).resolves.toEqual({ authenticated: false })
    expect(calls).toBe(2)
  })
})

describe('refreshCsrfToken', () => {
  it('已登录 → 把 csrf_token 写入 cookie', async () => {
    stubFetch(async () => envelope(authedSession()))
    await auth.refreshCsrfToken()
    expect(setCsrfTokenMock).toHaveBeenCalledWith('csrf-abc')
  })
  it('未登录 → 不写 csrf cookie', async () => {
    stubFetch(async () => envelope({ authenticated: false }))
    await auth.refreshCsrfToken()
    expect(setCsrfTokenMock).not.toHaveBeenCalled()
  })
  it('getSession 失败 → 静默吞掉不抛', async () => {
    stubFetch(async () => envelope(null, { status: 500 }))
    await expect(auth.refreshCsrfToken()).resolves.toBeUndefined()
  })
})

describe('login', () => {
  it('真实模式：清 CSRF + 整页跳 auth/login，默认 return_to=当前路径、不带 force', () => {
    const assign = stubAssign()
    mockEnv.bffHost = 'https://bff.example.com'
    auth.login()
    expect(clearCsrfTokenMock).toHaveBeenCalledOnce()
    expect(assign).toHaveBeenCalledWith('https://bff.example.com/auth/login?return_to=%2F')
  })
  it('真实模式 forceLogin=true → URL 带 force=1', () => {
    const assign = stubAssign()
    mockEnv.bffHost = 'https://bff.example.com'
    auth.login('/home', true)
    expect(assign.mock.calls[0][0]).toContain('force=1')
  })
  it('mock 模式：仅清 CSRF，不触发跳转', () => {
    mockEnv.useMockAuth = true
    const assign = stubAssign()
    auth.login('/home')
    expect(clearCsrfTokenMock).toHaveBeenCalledOnce()
    expect(assign).not.toHaveBeenCalled()
  })
})

describe('getFrontendProfile', () => {
  const profile = {
    subject: 'user:1',
    system_code: 'demo',
    environment: 'test',
    permission_version: 'v1',
    menus: [],
    pages: [],
    operations: [],
    modules: [],
    resource_ids: ['page:view'],
    ttl_seconds: 60,
  }
  it('真实模式拉取画像', async () => {
    stubFetch(async () => envelope(profile))
    await expect(auth.getFrontendProfile()).resolves.toMatchObject({ subject: 'user:1', resource_ids: ['page:view'] })
    expect(fetchMock.mock.calls[0][0] as string).toContain('/frontend-profile')
  })
  it('mock 模式：调 mockGetFrontendProfile', async () => {
    mockEnv.useMockAuth = true
    auth.registerAuthMocks(mockAuthMocks)
    mockAuthMocks.mockGetFrontendProfile.mockResolvedValue(profile)
    await expect(auth.getFrontendProfile()).resolves.toMatchObject({ subject: 'user:1' })
    expect(mockAuthMocks.mockGetFrontendProfile).toHaveBeenCalledOnce()
  })
})

describe('logout（真实模式）', () => {
  it('scope=application：getSession(true) + POST /logout 带 body 与 X-CSRF-Token', async () => {
    let capturedInit: RequestInit | undefined
    stubFetch(async (_url, init) => {
      capturedInit = init
      if (init.method === 'POST') return envelope({ logged_out: true })
      return envelope(authedSession())
    })
    // logout 真实分支算完 result 不 return（源码如此），只断言请求参数
    await auth.logout('application')
    expect(capturedInit!.method).toBe('POST')
    expect(capturedInit!.body).toBe(JSON.stringify({ scope: 'application' }))
    expect((capturedInit!.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-abc')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('session 未认证 → 不调 logout，直接 return', async () => {
    stubFetch(async () => envelope({ authenticated: false }))
    await auth.logout()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it('mock 模式：直接调 mockLogout 不 fetch', async () => {
    mockEnv.useMockAuth = true
    auth.registerAuthMocks(mockAuthMocks)
    stubFetch(async () => envelope(null))
    await auth.logout('sso')
    expect(mockAuthMocks.mockLogout).toHaveBeenCalledWith('sso')
    expect(fetchMock.mock.calls.length).toBe(0)
  })
  it('scope=sso 缺 sso_redirect → 抛 BffError 缺少统一退出地址', async () => {
    stubFetch(async (_url, init) =>
      init.method === 'POST' ? envelope({ logged_out: true }) : envelope(authedSession()),
    )
    await expect(auth.logout('sso')).rejects.toMatchObject({ message: '缺少统一退出地址' })
  })
  it('scope=sso 协议非 http(s) → 抛统一退出地址不合法', async () => {
    stubFetch(async (_url, init) =>
      init.method === 'POST' ? envelope({ logged_out: true, sso_redirect: 'ftp://x/exit' }) : envelope(authedSession()),
    )
    await expect(auth.logout('sso')).rejects.toMatchObject({ message: '统一退出地址不合法' })
  })
  it('scope=sso 合法 https → window.location.assign 跳转', async () => {
    const assign = stubAssign()
    stubFetch(async (_url, init) =>
      init.method === 'POST' ? envelope({ logged_out: true, sso_redirect: 'https://sso.example.com/exit' }) : envelope(authedSession()),
    )
    await auth.logout('sso')
    expect(assign).toHaveBeenCalledWith('https://sso.example.com/exit')
  })
})
