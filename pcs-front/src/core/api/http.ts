/**
 * Axios 请求底座（PermissionAccessManual2 v2 接入形态）
 *
 * 整个页面模板层的统一请求入口。拦截器/错误码/重试逻辑用 mock 跑通，
 * 真实后端留切换钩子、不假设已存在。
 *
 * 设计要点：
 *   - 多后端地址共用一套拦截器：attachInterceptors 抽为具名函数，createHttp 工厂统一套用；
 *     CSRF 注入 / 结构解包 / 错误分流 / 重试逻辑对所有实例、所有地址完全一致。
 *   - 不再注入 Authorization、不再做 401 静默刷新：浏览器只持 HttpOnly Cookie，
 *     令牌由 BFF 在服务端管理。401/403 响应由业务注入的 handlers 处理（见 ./handlers）。
 *   - 写操作（POST/PUT/DELETE/PATCH）禁自动重试（防重复提交），仅幂等 GET/HEAD/OPTIONS 重试。
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@core/config/env'
import { getCsrfToken } from '@core/utils/csrf'
import { ERROR_TEXT, BIZ_CODE_MAP, type NormalizedApiError } from './errorCode'
import { runOnUnauthorized, runOnCsrfStale } from './handlers'
import {
  dispatchError,
  isRetryableError,
  normalizeError,
  DEFAULT_RETRY,
  IDEMPOTENT_METHODS,
  OK_CODE,
  RETRY_BASE_DELAY,
  WRITE_METHODS,
  type ApiEnvelope,
} from './httpError'

/**
 * 后端地址模块：多后端（主业务/文件服务/网关）共用一套拦截器，仅 baseURL 不同。
 * `(string & {})` 允许业务项目扩展新模块键（如 'payment'），同时保留内置模块的 IDE 拼写提示。
 */
export type ApiModule = 'main' | 'file' | 'gateway' | (string & {})

/** 请求级 meta 配置，透传于 config.meta。 */
export interface RequestMeta {
  /** 跳过 CSRF 注入（如 /auth/* 自身、未登录可调的公开接口）。 */
  skipAuth?: boolean
  /** 抑制自动 Toast（如取消、后台静默请求）。 */
  silent?: boolean
  /** 覆盖重试次数；false 关闭重试。缺省用 DEFAULT_RETRY。 */
  retry?: number | false
  /** 选择后端地址模块，缺省 main。 */
  apiModule?: ApiModule
  /** 单请求级 baseURL 覆盖（优先级高于 apiModule）。 */
  baseURL?: string
}

declare module 'axios' {
  interface AxiosRequestConfig {
    meta?: RequestMeta
  }
  interface InternalAxiosRequestConfig {
    /** 幂等重试计数（内部）。 */
    _retryCount?: number
  }
}

/** 内置模块的显式覆盖值：业务项目赋值（API_HOSTS.main = 'x'）后优先于 env 实时取值。 */
const hostOverrides: Partial<Record<ApiModule, string>> = {}

/** 内置三键的默认地址：均用访问器实时读 env（见下注释），file/gateway 取各自独立运行时地址。 */
const BUILTIN_URL: Record<'main' | 'file' | 'gateway', () => string> = {
  main: () => env.apiBaseUrl,
  file: () => env.apiFileUrl,
  gateway: () => env.apiGatewayUrl,
}

/**
 * @deprecated 2.0 删除：多后端地址改由运行时 config.js（apiFileUrl/apiGatewayUrl）配置，见 /config 文档；1.x 保留 setter 兼容。
 * 多后端地址映射表。
 * 内置三键：main/file/gateway 分别读 apiBaseUrl、apiFileUrl、apiGatewayUrl（未配置时回落主地址）。
 * 接口前缀 /api 由调用方在 url 中写明（如 get('/api/waybills')），不在 baseURL 拼接。
 *
 * 内置三键用访问器实时读 env，不能写成字面量快照：
 * 本模块被包入口静态导入，求值时机早于业务 main.ts 的 await loadConfig()，
 * 字面量会把此刻的空值固化成快照，loadConfig 之后再也拿不到真实地址（同 env.ts 顶层 const 陷阱）。
 * 保留 setter 与新增键能力：业务项目可覆盖内置模块或追加自有模块（见 __tests__/extendable.spec.ts），
 * 但新增的自定义键必须自行赋值地址，否则请求会回落主地址并触发告警（见 onRequest）。
 */
export const API_HOSTS: Record<ApiModule, string> = Object.defineProperties(
  {} as Record<ApiModule, string>,
  Object.fromEntries(
    (['main', 'file', 'gateway'] as const).map((key) => [
      key,
      {
        enumerable: true,
        get: () => hostOverrides[key] ?? BUILTIN_URL[key](),
        set: (value: string) => {
          hostOverrides[key] = value
        },
      },
    ]),
  ),
)

/**
 * @deprecated 2.0 删除：请求追踪 id 由请求底座/流式层内部生成，业务无需调用。
 * 生成请求追踪 ID，便于全链路排查（流式层 httpStream.ts 复用同一实现注入 X-Request-Id）。
 */
export function genRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 请求拦截器（具名，供所有实例共用）：baseURL 实时回填 + CSRF 注入 + 追踪头 + 超时。 */
function onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 实例可能在 loadConfig() 之前创建（包入口静态导入即触发），此时 baseURL/timeout 被固化为空值。
  // 发请求这一刻运行时配置必定已就绪，故按 apiModule 实时回填，确保请求打到真实后端地址。
  if (!config.baseURL) {
    const module = config.meta?.apiModule ?? 'main'
    const host = API_HOSTS[module]
    if (host) {
      config.baseURL = host
    } else {
      // 未知模块键且业务未提供任何地址：不静默误路由到错误后端，回落主地址并告警提示。
      if (module !== 'main') {
        console.warn(
          `[http] 后端模块 "${module}" 未配置地址，请求回落至主业务地址。` +
            `请在 config.js 配置对应 api*Url 或设置 API_HOSTS.${module}。`,
        )
      }
      config.baseURL = env.apiBaseUrl
    }
  }
  if (!config.timeout) config.timeout = env.apiTimeout
  const headers = config.headers ?? new AxiosHeaders()
  // 写方法注入 X-CSRF-Token（值来自 /auth/session 写入的 csrf-token cookie，见 @/utils/csrf）
  if (!config.meta?.skipAuth) {
    const method = (config.method ?? 'get').toLowerCase()
    if (WRITE_METHODS.has(method)) {
      const csrfToken = getCsrfToken()
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
    }
  }
  headers.set('X-Request-Id', genRequestId())
  config.headers = headers
  if (config.meta?.baseURL) config.baseURL = config.meta.baseURL
  return config
}

/**
 * 响应成功拦截器：返回完整 response（data 已改写为解包后的业务数据）。
 * blob/arraybuffer 跳过解包（保留原始体与 headers 供 download 读取）；
 * 业务码非 200 则 reject 归一错误。帮助函数（request.ts）统一读 response.data。
 */
function onResponse(response: AxiosResponse): AxiosResponse | Promise<AxiosResponse> {
  const responseType = response.config.responseType
  if (responseType === 'blob' || responseType === 'arraybuffer') return response

  const envelope = response.data as ApiEnvelope | undefined
  if (!envelope || typeof envelope.code !== 'number') return response
  if (envelope.code === OK_CODE) {
    response.data = envelope.data
    return response
  }
  // HTTP 200 但业务码非正常：按业务码段映射（预留），缺省业务类取后端 msg
  const bizMeta = BIZ_CODE_MAP[envelope.code]
  const normalized: NormalizedApiError = {
    kind: bizMeta?.kind ?? 'business',
    httpStatus: response.status,
    bizCode: envelope.code,
    message: envelope.msg || bizMeta?.text || ERROR_TEXT.business,
    raw: response.data,
  }
  dispatchError(normalized, response.config.meta?.silent ?? false)
  return Promise.reject(normalized)
}

/** 401/403 已由业务注入的 onUnauthorized / onCsrfStale 处理（见 ./handlers），请求层不再依赖 router/auth。 */

/** 响应错误拦截器工厂：绑定所属实例以便重放（重试）；401 走注入的 onUnauthorized（单飞去重）。 */
function createOnResponseError(instance: AxiosInstance) {
  return async (error: AxiosError): Promise<AxiosResponse> => {
    const config = error.config as InternalAxiosRequestConfig | undefined
    if (!config) return Promise.reject(normalizeError(error))

    const meta = config.meta ?? {}
    const status = error.response?.status

    // 1) 401：session 失效（非 skipAuth 请求）；runOnUnauthorized 内置单飞去重，不再做静默刷新
    if (status === 401 && !meta.skipAuth) {
      runOnUnauthorized()
      const normalized = normalizeError(error)
      dispatchError(normalized, meta.silent ?? false)
      return Promise.reject(normalized)
    }

    // 2) 403：CSRF Token 可能已轮换（非 skipAuth 写请求），异步刷新 cookie 供下次请求用；
    //    当前请求仍按权限不足抛错，避免写操作自动重试导致重复提交
    if (status === 403 && !meta.skipAuth) {
      runOnCsrfStale()
    }

    // 2) 幂等请求的超时/网络/5xx 自动重试（写操作不重试）
    const method = (config.method ?? 'get').toLowerCase()
    const maxRetry = meta.retry === false ? 0 : (meta.retry ?? DEFAULT_RETRY)
    if (
      maxRetry > 0 &&
      IDEMPOTENT_METHODS.has(method) &&
      isRetryableError(error) &&
      error.code !== 'ERR_CANCELED'
    ) {
      const count = config._retryCount ?? 0
      if (count < maxRetry) {
        config._retryCount = count + 1
        const delay = RETRY_BASE_DELAY * 3 ** count
        await new Promise((resolve) => setTimeout(resolve, delay))
        return instance.request(config)
      }
    }

    // 3) 归一分流 + Toast
    const normalized = normalizeError(error)
    dispatchError(normalized, meta.silent ?? false)
    return Promise.reject(normalized)
  }
}

/**
 * @deprecated 2.0 删除：实例由 getHttp/createHttp 统一创建并套用拦截器，业务无需手动调用。
 * 把统一拦截器套到实例上（多地址/多实例共用同一份逻辑）。
 */
export function attachInterceptors(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use(onRequest)
  instance.interceptors.response.use(onResponse, createOnResponseError(instance))
  return instance
}

/**
 * 实例工厂：按 baseURL 创建并统一套用拦截器。
 * 不写死 Content-Type：JSON body 由 axios 自动补 application/json，
 * FormData 则原样交给浏览器带 multipart boundary（写死 json 头会使 FormData 被序列化）。
 *
 * baseURL 传空串则交由 onRequest 在发请求时按 meta.apiModule 实时回填（见 getHttp）；
 * 显式传入非空地址时以传入值为准，onRequest 不覆盖。
 */
export function createHttp(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: env.apiTimeout,
    // 跨域场景下携带 HttpOnly Cookie（BFF 需配 Access-Control-Allow-Credentials: true + 具体 origin 白名单）
    withCredentials: true,
  })
  return attachInterceptors(instance)
}

/** 各后端模块的实例注册表，按需惰性创建，共享同一套拦截器。 */
const instances = new Map<ApiModule, AxiosInstance>()

/**
 * 取某后端模块的实例（缺省 main），不存在则惰性创建。
 * 不把 API_HOSTS[module] 传给 createHttp：实例可能在 loadConfig() 之前创建、此刻地址仍为空，
 * 改为在 defaults.meta 记下所属模块，由 onRequest 在发请求时按模块实时回填 baseURL。
 */
export function getHttp(module: ApiModule = 'main'): AxiosInstance {
  const cached = instances.get(module)
  if (cached) return cached
  const created = createHttp('')
  created.defaults.meta = { ...created.defaults.meta, apiModule: module }
  instances.set(module, created)
  return created
}

/** 主业务实例：一次性业务请求的默认出口。 */
export const http = getHttp('main')
