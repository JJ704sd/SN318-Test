/**
 * Axios 错误归一与分流（从 http.ts 拆出以单一职责）。
 *
 * http.ts 负责实例工厂与拦截器编排，本层只负责「把 axios 抛出的各类错误
 * 折叠成统一的 NormalizedApiError，并决定是否提示、是否可重试」。
 * 错误码到文案的映射表本身在 errorCode.ts；本层是应用这些映射的判定逻辑。
 * 错误提示不直接 import UI：由业务注入的 onError（configureApiHandlers）响应。
 */

import type { AxiosError } from 'axios'
import { runOnError } from './handlers'
import { ERROR_TEXT, resolveHttpMeta, type NormalizedApiError } from './errorCode'

/** 后端返回统一信封结构。 */
export interface ApiEnvelope<T = unknown> {
  code: number
  data: T
  msg?: string
}

/** 业务正常码。 */
export const OK_CODE = 200
/** 幂等重试上限。 */
export const DEFAULT_RETRY = 2
/** 重试退避基数（ms），指数退避 300->900。 */
export const RETRY_BASE_DELAY = 300
/** 可重试的幂等方法。 */
export const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options'])
/** 写方法：注入 X-CSRF-Token 防跨站写攻击。 */
export const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

/** 判断错误是否可重试：无响应（断网/超时）或服务端 5xx。 */
export function isRetryableError(error: AxiosError): boolean {
  if (!error.response) return true
  return error.response.status >= 500
}

/** 把 axios 错误归一为四类分流的标准错误对象（文案友好、不暴露堆栈）。 */
export function normalizeError(error: AxiosError): NormalizedApiError {
  // 取消请求（含 AbortController.abort）：归网络类、静默不弹
  if (error.code === 'ERR_CANCELED') {
    return { kind: 'network', httpStatus: 0, message: ERROR_TEXT.aborted, raw: error }
  }
  // 无响应：断网 / DNS 失败 / 超时 -- 统一网络类
  if (!error.response) {
    return { kind: 'network', httpStatus: 0, message: ERROR_TEXT.network, raw: error }
  }
  const { status, data } = error.response
  const envelope = data as Partial<ApiEnvelope> | undefined
  const meta = resolveHttpMeta(status)
  // 业务类优先取后端 msg 原文
  const message = meta.kind === 'business' && envelope?.msg ? envelope.msg : meta.text
  return { kind: meta.kind, httpStatus: status, bizCode: envelope?.code, message, raw: error }
}

/** 分流后交给注入的 onError 提示（silent 或取消请求不提示；错误码只折叠进日志、不展示）。 */
export function dispatchError(normalized: NormalizedApiError, silent: boolean): void {
  if (silent) return
  if (normalized.message === ERROR_TEXT.aborted) return
  runOnError(normalized)
}
