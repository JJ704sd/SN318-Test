/**
 * API 响应处理器（依赖反转层）—— configureApiHandlers
 *
 * 通用能力框架只提供请求底座，不依赖具体 UI / router / auth：错误提示、未认证跳转、
 * CSRF 失效响应由业务系统在创建 router 后、mount 前注入 onError/onUnauthorized/onCsrfStale。
 *
 * 约定：
 *   - configureApiHandlers 覆盖式注册，可重复调用（HMR 重复初始化即安全替换旧 handler）；
 *   - 并发 401（axios + 流式多路）只触发一次 onUnauthorized（单飞 latch）；
 *   - 注入的 handler 自身报错只 console.error，不吞调用方的原始请求 reject。
 * 未注册某 handler 时该事件静默并首次 console.warn 提示（1.x 迁移期不再有包内默认 UI 行为）。
 */

import type { NormalizedApiError } from './errorCode'

export interface ApiHandlers {
  /** 请求失败提示（错误 Toast 等）。 */
  onError?: (error: NormalizedApiError) => void
  /** 401 会话失效（跳登录/整页退出）；并发 401 只触发一次。 */
  onUnauthorized?: () => void | Promise<void>
  /** 403 CSRF 可能已轮换（刷新 csrf cookie 等）。 */
  onCsrfStale?: () => void | Promise<void>
}

let handlers: ApiHandlers = {}

/** 覆盖式注册：重复调用即安全替换整个槽位，避免热更新后旧 handler 残留。 */
export function configureApiHandlers(next: ApiHandlers): void {
  handlers = { ...next }
}

const warned = new Set<keyof ApiHandlers>()
function warnMissing(key: keyof ApiHandlers): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(
    `[api] configureApiHandlers 未注册 ${key}，已跳过对应处理。请在业务入口注入 UI/跳转响应。`,
  )
}

/** 触发 onError（错误提示）。handler 抛错仅记录，不吞调用方的请求 reject。 */
export function runOnError(normalized: NormalizedApiError): void {
  const fn = handlers.onError
  if (!fn) {
    warnMissing('onError')
    return
  }
  try {
    fn(normalized)
  } catch (error) {
    console.error('[api] onError 处理出错', error)
  }
}

/** 401 单飞触发 onUnauthorized：相邻并发 401（axios + 流式）只执行一次跳转/退出。 */
let unauthorizedInFlight: Promise<void> | null = null
export function runOnUnauthorized(): void {
  const fn = handlers.onUnauthorized
  if (!fn) {
    warnMissing('onUnauthorized')
    return
  }
  if (unauthorizedInFlight) return
  unauthorizedInFlight = Promise.resolve()
    .then(() => fn())
    .catch((error) => console.error('[api] onUnauthorized 处理出错', error))
    .finally(() => {
      unauthorizedInFlight = null
    })
}

/** 触发 onCsrfStale（403 CSRF 轮换）。 */
export function runOnCsrfStale(): void {
  const fn = handlers.onCsrfStale
  if (!fn) {
    warnMissing('onCsrfStale')
    return
  }
  Promise.resolve()
    .then(() => fn())
    .catch((error) => console.error('[api] onCsrfStale 处理出错', error))
}
