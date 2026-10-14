/**
 * http.ts · Axios 请求底座单元测试
 *
 * http.ts 的拦截器函数（onRequest / onResponse / createOnResponseError）未导出，
 * 故通过 mock axios.create 捕获实例上注册的拦截器槽位再直接驱动，覆盖：
 *   - onRequest：多后端 baseURL 实时回填 / CSRF 注入 / 追踪头 / 超时 / meta.baseURL 覆盖 / 未知模块回落
 *   - onResponse：200 信封解包 / 业务码非 200 归一分流 / blob 跳过 / 非信封原样
 *   - createOnResponseError：401(含 skipAuth)/403 CSRF 轮换 / 幂等重试 / 写请求不重试 / 取消不重试 / 无 config
 *   - 实例工厂：getHttp 缓存与多模块隔离、createHttp 套拦截器、API_HOSTS 实时读 env 与 setter 覆盖、genRequestId
 *
 * 依赖隔离：env / csrf / handlers 分别 mock；httpError 整体 mock（RETRY_BASE_DELAY=0 使重试近乎瞬时，
 * 无需 fake timer）。errorCode 保持真实。axios 经 importOriginal 保留真 AxiosHeaders/AxiosError，仅替换 create。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosHeaders, type AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { API_HOSTS, createHttp, genRequestId, getHttp, type RequestMeta } from './http'
import { ERROR_TEXT, type NormalizedApiError } from './errorCode'

const h = vi.hoisted(() => {
  const envValues: Record<string, string | number> = {
    apiBaseUrl: 'https://api-main.test',
    apiFileUrl: 'https://api-file.test',
    apiGatewayUrl: 'https://api-gateway.test',
    apiTimeout: 15000,
  }
  const getCsrfTokenMock = vi.fn<() => string>()
  const runOnUnauthorizedMock = vi.fn<() => void>()
  const runOnCsrfStaleMock = vi.fn<() => void>()
  const dispatchErrorMock = vi.fn<(error: NormalizedApiError, silent: boolean) => void>()
  const isRetryableErrorMock = vi.fn<(error: AxiosError) => boolean>()
  const normalizeErrorMock = vi.fn<(error: AxiosError) => NormalizedApiError>()

  let requestInterceptor: unknown = null
  let responseFulfilled: unknown = null
  let responseRejected: unknown = null
  let lastClient: unknown = null

  const makeFakeClient = () => ({
    defaults: {} as Record<string, unknown>,
    interceptors: {
      request: {
        use(fn: unknown): () => void {
          requestInterceptor = fn
          return () => {}
        },
      },
      response: {
        use(onFulfilled: unknown, onRejected: unknown): () => void {
          responseFulfilled = onFulfilled
          responseRejected = onRejected
          return () => {}
        },
      },
    },
    request: vi.fn<(cfg: InternalAxiosRequestConfig) => Promise<unknown>>(async () => ({ data: undefined })),
  })

  const axiosCreate = vi.fn<(_config: unknown) => unknown>(() => {
    const c = makeFakeClient()
    lastClient = c
    return c
  })

  return {
    envValues,
    getCsrfTokenMock,
    runOnUnauthorizedMock,
    runOnCsrfStaleMock,
    dispatchErrorMock,
    isRetryableErrorMock,
    normalizeErrorMock,
    axiosCreate,
    getReq: (): unknown => requestInterceptor,
    getResFul: (): unknown => responseFulfilled,
    getResRej: (): unknown => responseRejected,
    last: (): unknown => lastClient,
  }
})

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { create: h.axiosCreate } as unknown as typeof import('axios')['default'] }
})
vi.mock('@core/config/env', () => ({
  env: {
    get apiBaseUrl(): string {
      return String(h.envValues.apiBaseUrl)
    },
    get apiFileUrl(): string {
      return String(h.envValues.apiFileUrl)
    },
    get apiGatewayUrl(): string {
      return String(h.envValues.apiGatewayUrl)
    },
    get apiTimeout(): number {
      return Number(h.envValues.apiTimeout)
    },
  },
}))
vi.mock('@core/utils/csrf', () => ({ getCsrfToken: h.getCsrfTokenMock }))
vi.mock('./handlers', () => ({ runOnUnauthorized: h.runOnUnauthorizedMock, runOnCsrfStale: h.runOnCsrfStaleMock }))
vi.mock('./httpError', () => ({
  dispatchError: h.dispatchErrorMock,
  isRetryableError: h.isRetryableErrorMock,
  normalizeError: h.normalizeErrorMock,
  DEFAULT_RETRY: 2,
  IDEMPOTENT_METHODS: new Set(['get', 'head', 'options']),
  OK_CODE: 200,
  RETRY_BASE_DELAY: 0,
  WRITE_METHODS: new Set(['post', 'put', 'patch', 'delete']),
}))

/** 构造请求配置：默认带真实 AxiosHeaders（onRequest 里可读/写 header）。 */
function reqConfig(over: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return { method: 'get', url: '/api/ping', headers: new AxiosHeaders(), ...over } as InternalAxiosRequestConfig
}
function makeResponse(data: unknown, cfg: Partial<InternalAxiosRequestConfig> = {}): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config: reqConfig(cfg) } as AxiosResponse
}
function makeError(status: number | undefined, cfg: Partial<InternalAxiosRequestConfig> = {}, code?: string): AxiosError {
  const config = reqConfig(cfg)
  const response = status === undefined ? undefined : { data: {}, status, statusText: '', headers: {}, config }
  return {
    config,
    response,
    code,
    isAxiosError: true,
    name: 'AxiosError',
    message: `ERR ${status ?? 'no-status'}`,
    toJSON: () => ({}),
  } as AxiosError
}

/** 直接驱动注册到的三个拦截器。 */
function requestFulfilled(cfg: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const fn = h.getReq() as (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
  return fn(cfg)
}
function responseFulfilled(res: AxiosResponse): AxiosResponse | Promise<AxiosResponse> {
  const fn = h.getResFul() as (r: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
  return fn(res)
}
function responseRejected(err: AxiosError): Promise<AxiosResponse> {
  const fn = h.getResRej() as (e: AxiosError) => Promise<AxiosResponse>
  return fn(err)
}
function lastClient(): AxiosInstance {
  return h.last() as AxiosInstance
}

/** 每用例重置 mock 状态：拦截器槽位在 import 时已注册、跨用例稳定，直接复用断言。 */
beforeEach(() => {
  h.getCsrfTokenMock.mockReset().mockReturnValue('')
  h.runOnUnauthorizedMock.mockReset()
  h.runOnCsrfStaleMock.mockReset()
  h.dispatchErrorMock.mockReset()
  h.isRetryableErrorMock.mockReset().mockReturnValue(false)
  h.normalizeErrorMock.mockReset().mockReturnValue({ kind: 'network', httpStatus: 0, message: ERROR_TEXT.network })
  ;(lastClient() as AxiosInstance & { request: { mockReset(): void } }).request.mockReset()
})

describe('http.ts · onRequest 请求拦截器', () => {
  it('baseURL 实时回填：模块/缺省回落/显式保留/meta 覆盖/超时', () => {
    const req = (o: Partial<InternalAxiosRequestConfig>) => requestFulfilled(reqConfig(o))
    const file = req({ meta: { apiModule: 'file' } })
    expect(file.baseURL).toBe('https://api-file.test')
    expect(file.timeout).toBe(15000)
    expect(file.headers.get('X-Request-Id')).toBeTruthy()
    expect(req({}).baseURL).toBe('https://api-main.test')
    expect(req({ baseURL: 'https://keep.test' }).baseURL).toBe('https://keep.test')
    expect(req({ meta: { apiModule: 'file', baseURL: 'https://override.test' } }).baseURL).toBe('https://override.test')
  })

  it('未知模块未配置地址：回落 main 并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined)
    const out = requestFulfilled(reqConfig({ meta: { apiModule: 'payment', url: '/api/p' } as RequestMeta, baseURL: undefined }))
    expect(out.baseURL).toBe('https://api-main.test')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('写方法注入 X-CSRF-Token（非 skipAuth）', () => {
    h.getCsrfTokenMock.mockReturnValue('csrf-tok')
    expect(requestFulfilled(reqConfig({ method: 'post' })).headers.get('X-CSRF-Token')).toBe('csrf-tok')
  })

  it('不注入 CSRF 头：无 token / skipAuth / 幂等 GET', () => {
    const csrf = (o: Partial<InternalAxiosRequestConfig>) => requestFulfilled(reqConfig(o)).headers.get('X-CSRF-Token')
    expect(csrf({ method: 'delete' })).toBeUndefined()
    h.getCsrfTokenMock.mockReturnValue('tok')
    expect(csrf({ method: 'post', meta: { skipAuth: true } })).toBeUndefined()
    expect(csrf({ method: 'get' })).toBeUndefined()
  })
})

describe('http.ts · onResponse 响应成功拦截器', () => {
  it('200 信封：解包 data', () => {
    const out = responseFulfilled(makeResponse({ code: 200, data: { id: 1 } })) as AxiosResponse
    expect(out.data).toEqual({ id: 1 })
    expect(h.dispatchErrorMock).not.toHaveBeenCalled()
  })

  it('业务码非 200：dispatchError 并 reject（无 msg 回落兜底、silent 透传）', async () => {
    await expect(responseFulfilled(makeResponse({ code: 1001, msg: '库存不足' })) as Promise<unknown>).rejects.toMatchObject({
      kind: 'business',
      bizCode: 1001,
      message: '库存不足',
    })
    expect(h.dispatchErrorMock).toHaveBeenCalledWith(expect.objectContaining({ bizCode: 1001 }), false)
    await expect(responseFulfilled(makeResponse({ code: 3001 })) as Promise<unknown>).rejects.toMatchObject({
      message: ERROR_TEXT.business,
    })
    await expect(responseFulfilled(makeResponse({ code: 1001, msg: 'x' }, { meta: { silent: true } })) as Promise<unknown>).rejects.toMatchObject({ bizCode: 1001 })
    expect(h.dispatchErrorMock).toHaveBeenCalledWith(expect.any(Object), true)
  })

  it('非信封数据或 blob/arraybuffer 响应：原样返回', () => {
    const res1 = makeResponse({ id: 1 })
    expect(responseFulfilled(res1)).toBe(res1)
    const res2 = makeResponse(new Blob(['x']), { responseType: 'blob' })
    expect(responseFulfilled(res2)).toBe(res2)
  })
})

describe('http.ts · createOnResponseError 响应错误拦截器', () => {
  it('401 触发 onUnauthorized（非 skipAuth）；skipAuth 则不触发', async () => {
    h.normalizeErrorMock.mockReturnValue({ kind: 'permission', httpStatus: 401, message: ERROR_TEXT.permission })
    await expect(responseRejected(makeError(401, { method: 'get' }))).rejects.toMatchObject({ httpStatus: 401 })
    expect(h.runOnUnauthorizedMock).toHaveBeenCalledTimes(1)
    await expect(responseRejected(makeError(401, { method: 'get', meta: { skipAuth: true } }))).rejects.toBeDefined()
    expect(h.runOnUnauthorizedMock).toHaveBeenCalledTimes(1)
    expect(h.dispatchErrorMock).toHaveBeenCalledTimes(2)
    expect(h.last()?.request).not.toHaveBeenCalled()
  })

  it('403 非 skipAuth：触发 onCsrfStale', async () => {
    await expect(responseRejected(makeError(403, { method: 'post', meta: { url: '/api/w' } }))).rejects.toBeDefined()
    expect(h.runOnCsrfStaleMock).toHaveBeenCalledTimes(1)
  })

  it('幂等 GET 可重试错误：递增 _retryCount 并经 instance.request 重发', async () => {
    h.isRetryableErrorMock.mockReturnValue(true)
    const requestMock = h.last()?.request as ReturnType<typeof vi.fn>
    requestMock.mockResolvedValue({ data: 'retried' })
    const err = makeError(503, { method: 'get', url: '/api/g' })
    const out = await responseRejected(err)
    expect(out).toEqual({ data: 'retried' })
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ _retryCount: 1 }))
    expect(h.dispatchErrorMock).not.toHaveBeenCalled()
  })

  it('写请求 POST 遇可重试错误：不自动重试（防重复提交）、归一分流', async () => {
    h.isRetryableErrorMock.mockReturnValue(true)
    h.normalizeErrorMock.mockReturnValue({ kind: 'system', httpStatus: 502, message: ERROR_TEXT.system })
    const err = makeError(502, { method: 'post', url: '/api/w' })
    await expect(responseRejected(err)).rejects.toMatchObject({ httpStatus: 502 })
    expect(h.last()?.request).not.toHaveBeenCalled()
    expect(h.dispatchErrorMock).toHaveBeenCalledWith(expect.objectContaining({ httpStatus: 502 }), false)
  })

  it('重试守卫：retry=false、已达上限、ERR_CANCELED 均不重试', async () => {
    h.isRetryableErrorMock.mockReturnValue(true)
    h.normalizeErrorMock.mockReturnValue({ kind: 'system', httpStatus: 503, message: ERROR_TEXT.system })
    const notRetried = async (err: AxiosError) => {
      await expect(responseRejected(err)).rejects.toBeDefined()
      expect(h.last()?.request).not.toHaveBeenCalled()
    }
    await notRetried(makeError(500, { method: 'get', meta: { retry: false } }))
    const exhausted = makeError(503, { method: 'get' })
    exhausted.config!._retryCount = 2 // == DEFAULT_RETRY
    await notRetried(exhausted)
    await notRetried(makeError(503, { method: 'get' }, 'ERR_CANCELED'))
    expect(h.dispatchErrorMock).toHaveBeenCalledTimes(3)
  })

  it('error 无 config：直接 reject 归一、不 dispatch', async () => {
    h.normalizeErrorMock.mockReturnValue({ kind: 'network', httpStatus: 0, message: ERROR_TEXT.network })
    const bare = { isAxiosError: true, name: 'AxiosError', message: 'no cfg', toJSON: () => ({}) } as AxiosError
    await expect(responseRejected(bare)).rejects.toMatchObject({ kind: 'network' })
    expect(h.dispatchErrorMock).not.toHaveBeenCalled()
  })
})

describe('http.ts · 实例工厂与 API_HOSTS', () => {
  beforeEach(() => {
    // 还原可能被用例改写的覆盖地址（置 undefined 使 getter 回落 env），避免污染后续断言
    API_HOSTS.main = undefined as unknown as string
    API_HOSTS.file = undefined as unknown as string
    API_HOSTS.gateway = undefined as unknown as string
  })

  it('createHttp 以传入 baseURL 创建实例并套用拦截器（withCredentials=true）', () => {
    createHttp('https://x.test')
    expect(h.axiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://x.test', timeout: 15000, withCredentials: true }),
    )
    expect(typeof h.getReq()).toBe('function')
    expect(typeof h.getResFul()).toBe('function')
    expect(typeof h.getResRej()).toBe('function')
  })

  it('getHttp 惰性创建并缓存同一实例，defaults.meta 标注所属模块', () => {
    const mainA = getHttp('main')
    const mainB = getHttp('main')
    expect(mainB).toBe(mainA)
    expect(mainA.defaults.meta).toMatchObject({ apiModule: 'main' })
  })

  it('getHttp 不同模块创建独立实例', () => {
    expect(getHttp('file')).not.toBe(getHttp('main'))
    expect(getHttp('gateway')).not.toBe(getHttp('file'))
  })

  it('API_HOSTS 实时读 env，setter 覆盖优先', () => {
    expect(API_HOSTS.main).toBe('https://api-main.test')
    expect(API_HOSTS.file).toBe('https://api-file.test')
    expect(API_HOSTS.gateway).toBe('https://api-gateway.test')
    API_HOSTS.gateway = 'https://override-gw.test'
    expect(API_HOSTS.gateway).toBe('https://override-gw.test')
  })
})

describe('http.ts · genRequestId', () => {
  it('存在 crypto.randomUUID 时使用之；缺失时回落时间戳前缀', () => {
    const uidMock = vi.fn<() => string>(() => 'uuid-mock')
    vi.stubGlobal('crypto', { randomUUID: uidMock } as unknown as Crypto)
    expect(genRequestId()).toBe('uuid-mock')
    expect(uidMock).toHaveBeenCalled()
    vi.stubGlobal('crypto', undefined)
    expect(genRequestId()).toMatch(/^req-/)
    vi.unstubAllGlobals()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
