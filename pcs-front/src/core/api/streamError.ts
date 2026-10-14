/**
 * AI 流式错误 / 超时归因（实施方案任务 5.1B；规范 §02.2 原则四、§07 异常场景）
 *
 * 把流式传输过程中的各类失败（中断 / 首包超时 / 空闲超时 / 断网 / 5xx / 流内 error）
 * 归一为 { kind, reason }，交给 ai store 的 handleTimeout(kind) 或 failed（errorReason=reason）。
 *
 * 红线：
 *   - 中断（AbortError）不是失败——单列 'aborted'，由调用方落 store.abort() 的中性态，禁止进 failed。
 *   - 超时分层归因（首包/空闲/网络/服务端），禁止固定 10s 或笼统一个「超时」：
 *     长文本生成正常也会 >10s，固定超时会误杀。
 *   - reason 全走友好文案（复用 5.1A 的 ERROR_TEXT），不暴露堆栈 / 错误码。
 */

import { ERROR_TEXT, type NormalizedApiError } from './errorCode'

/**
 * AI 流式超时归因种类（网络 / 服务端 / 模型）。定义于 api 域供 ai store/aiStatus 引用，
 * 依赖方向 ai → api，避免 api 反向依赖 ai/store。
 */
export type AiTimeoutKind = 'network' | 'server' | 'model'

/**
 * 流式失败归因结果。
 * - kind='aborted'：用户主动停止，中性态，调用方走 store.abort()，【不进 failed】。
 * - kind ∈ AiTimeoutKind（network/server/model）：交 store.handleTimeout(kind)。
 * - kind='failed'：不可归类的接口/解析错误，交 store.failed，展示 reason。
 */
export type StreamErrorKind = AiTimeoutKind | 'aborted' | 'failed'

/** 归一后的流式错误：kind 决定 store 走向，reason 为面向用户的友好文案。 */
export interface StreamError {
  kind: StreamErrorKind
  /** 面向用户的原因文案（不含堆栈 / 错误码）。 */
  reason: string
}

/** 自定义 AI adapter 可把流式归因结果作为 Promise rejection 交给 store。 */
export function isStreamError(error: unknown): error is StreamError {
  if (!error || typeof error !== 'object') return false
  const candidate = error as Partial<StreamError>
  return (
    typeof candidate.reason === 'string' &&
    ['network', 'server', 'model', 'aborted', 'failed'].includes(candidate.kind ?? '')
  )
}

/** AI 流式专用文案（主动句、专业简洁；规范 §08 文案，copy.ts 已废弃故就近持有）。 */
export const STREAM_ERROR_TEXT = {
  /** 首包超时：模型迟迟未开始输出，引导稍后重试 / 重新生成。 */
  firstByteTimeout: 'AI 响应超时，请稍后重试',
  /** 空闲超时：流中途停顿过久，服务端可能仍在处理，引导继续等待。 */
  idleTimeout: 'AI 仍在处理，请稍候',
  /** 服务端错误（HTTP 5xx / 流内 error 事件）。 */
  server: 'AI 服务繁忙，请稍后重试',
  /** 兜底失败文案。 */
  failed: 'AI 服务异常，请稍后重试',
} as const

/** 流式请求的失败成因，来自 httpStream 各捕获点。 */
export type StreamFailurePhase =
  | 'abort' // AbortController.abort()（用户点停止）
  | 'firstByteTimeout' // 开流到第一个 chunk 超时（env.aiFirstByteTimeout）
  | 'idleTimeout' // 流中途 stall 超时（env.aiIdleTimeout）
  | 'network' // fetch reject（断网 / DNS / 连接失败）
  | 'httpError' // HTTP 非 2xx（携带 status）
  | 'streamEvent' // 流内 error 事件（携带后端给的文案）
  | 'parse' // 帧解析异常

/** httpStream 抛给归因器的原始成因描述。 */
export interface StreamFailure {
  phase: StreamFailurePhase
  /** httpError 时的 HTTP 状态码。 */
  status?: number
  /** streamEvent 时后端给的可展示文案（若可信）。 */
  message?: string
}

/**
 * 把原始成因归一为 { kind, reason }：
 *   - abort              → aborted（中性，调用方走 store.abort，禁止 failed）
 *   - firstByteTimeout   → model（模型未响应，引导稍后重试）
 *   - idleTimeout        → server（流已建立、服务端仍在处理，引导继续等待、不引导重试）
 *   - network            → network（断网，引导检查网络后重试）
 *   - httpError 5xx      → server；4xx / 其它 → failed
 *   - streamEvent        → failed（后端主动报错，优先用其文案）
 *   - parse              → failed
 */
export function resolveStreamError(failure: StreamFailure): StreamError {
  switch (failure.phase) {
    case 'abort':
      return { kind: 'aborted', reason: ERROR_TEXT.aborted }
    case 'firstByteTimeout':
      return { kind: 'model', reason: STREAM_ERROR_TEXT.firstByteTimeout }
    case 'idleTimeout':
      return { kind: 'server', reason: STREAM_ERROR_TEXT.idleTimeout }
    case 'network':
      return { kind: 'network', reason: ERROR_TEXT.network }
    case 'httpError':
      // 5xx 归服务端超时（服务端仍在/可稍后重试）；4xx 等归失败
      if (failure.status !== undefined && failure.status >= 500) {
        return { kind: 'server', reason: STREAM_ERROR_TEXT.server }
      }
      return { kind: 'failed', reason: STREAM_ERROR_TEXT.failed }
    case 'streamEvent':
      // 后端主动报错，优先展示其文案（须已是面向用户的友好文案，非堆栈）
      return { kind: 'failed', reason: failure.message || STREAM_ERROR_TEXT.failed }
    case 'parse':
    default:
      return { kind: 'failed', reason: STREAM_ERROR_TEXT.failed }
  }
}

/** 判断一个未知错误是否为 AbortController.abort() 触发（中断 ≠ 失败）。 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** 5.1A 归一错误对象类型透出，供流式层复用同一错误语义。 */
export type { NormalizedApiError }
