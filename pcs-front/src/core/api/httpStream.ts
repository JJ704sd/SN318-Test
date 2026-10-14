/**
 * AI 流式请求底座（PermissionAccessManual2 v2 接入形态）
 *
 * 5.1A 的 axios 底座处理一次性 {code,data,msg} 业务请求，浏览器端 axios 无法可靠
 * 增量读响应体、只能等整包，故不适合流式。AI 对话 / 建议 / 洞察需边生成边渲染，
 * 本层用 fetch + ReadableStream 做真正的流式传输，作为：
 *   - 任务 4.1 AiService.sendMessage 流式回调的真实传输实现；
 *   - 任务 4.3 LlmAdapter「对接 SSE/fetch stream」TODO 的落地处（import 本层 streamChat）。
 * 任务 4.2 MockAdapter 仍用 setTimeout 模拟、不经此层。
 *
 * 帧解析（SSE / NDJSON 拆帧、粘包/半包）拆到 streamParser.ts；本层只负责传输编排：
 * URL 组装、fetch 读流、超时分层、中断、401 跳登录。
 *
 * 与 5.1A 的复用（不重复造）：baseURL/streamPath/超时走 @/config/env；CSRF Token
 * 与 X-Request-Id 复用 genRequestId/getCsrfToken；401 复用注入的 onUnauthorized（./handlers）。
 *
 * 红线：禁用 axios（拿不到增量）；chunk 边界≠消息边界必须缓冲拆帧；中断≠失败（AbortError 落
 * aborted 中性态）；超时分层归因（首包->model / 空闲->server / 断网->network / 5xx->server|failed）；
 * 401 不重连（半截流重放会重复渲染），交由注入的 onUnauthorized 跳登录；密钥/endpoint 全走 env；错误文案走归因器、不暴露堆栈/错误码。
 */

import { env } from '@core/config/env'
import { getCsrfToken } from '@core/utils/csrf'
import { genRequestId } from './http'
import { runOnUnauthorized } from './handlers'
import {
  resolveStreamError,
  isAbortError,
  type StreamError,
  type StreamFailurePhase,
} from './streamError'
import { createStreamParser, type StreamEvent } from './streamParser'

export type { StreamEvent } from './streamParser'

/** 一条送入 AI 的对话消息（与后端 messages 数组对齐，独立于 UI 的 AiMessage）。 */
export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** 流式请求级配置。 */
export interface StreamRequestMeta {
  /** 跳过 CSRF 注入（供公开流用）。 */
  skipAuth?: boolean
  /** 覆盖流式接口路径（缺省 env.aiStreamPath）。 */
  path?: string
  /** 覆盖 baseURL（缺省 env.aiBaseUrl，其未配置时已在 env 层回落 apiBaseUrl）。 */
  baseURL?: string
  /** 追加到请求体的额外字段（如 scene / model / temperature）。 */
  extra?: Record<string, unknown>
}

/** streamChat 入参。 */
export interface StreamChatOptions {
  messages: StreamChatMessage[]
  /** 外部中断信号：接 ai store 的 abort()（用户点「停止」）。 */
  signal?: AbortSignal
  meta?: StreamRequestMeta
}

/**
 * 流式回调（传输层契约，供 4.3 LlmAdapter 桥接到 4.1 AiService.sendMessage）：
 *   onOpen  连接建立（驱动 store 由 requesting->thinking）
 *   onChunk 文本增量（UI 逐字追加）
 *   onEvent 结构化事件（工具调用/执行进度）
 *   onError 归因后的错误（交 store.handleTimeout(kind) 或 abort()/failed）
 *   onDone  收流，回传完整文本
 */
export interface StreamHandlers {
  onOpen?: () => void
  onChunk?: (deltaText: string) => void
  onEvent?: (event: StreamEvent) => void
  onError?: (error: StreamError) => void
  onDone?: (full: string) => void
}

/** 可中止句柄：abort() 落 aborted 中性态；done 在终态（成功/已归因错误）resolve，不 reject。 */
export interface StreamHandle {
  abort: () => void
  done: Promise<void>
}

/** 组装 CSRF 与追踪头（CSRF Token 从 cookie 读，见 @/utils/csrf）。 */
function buildHeaders(skipAuth?: boolean): Headers {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'text/event-stream')
  headers.set('X-Request-Id', genRequestId())
  if (!skipAuth) {
    const csrfToken = getCsrfToken()
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
  }
  return headers
}

/** 拼流式 URL：meta 覆盖 > env（env 层已处理 aiBaseUrl 未配置回落 apiBaseUrl）。 */
function buildUrl(meta?: StreamRequestMeta): string {
  const base = meta?.baseURL ?? env.aiBaseUrl
  const path = meta?.path ?? env.aiStreamPath
  return `${base}${path}`
}

/**
 * AI 流式对话底座：POST messages、fetch + getReader 逐块读、SSE/NDJSON 拆帧、超时分层、
 * 401 跳登录（不重连）。所有终态经 handlers 通知，返回可中止句柄。
 *
 * 真实 AI 端点切换点：URL 由 env.aiBaseUrl + aiStreamPath 决定，CSRF 头见 buildHeaders；
 * 接真实后端只需配置 env、后端按「SSE data: {delta|event|error} -> [DONE]」协议返回即可，本层不改。
 */
export function streamChat(options: StreamChatOptions, handlers: StreamHandlers): StreamHandle {
  const { messages, signal, meta } = options
  const { onOpen, onChunk, onEvent, onError, onDone } = handlers

  const controller = new AbortController()
  // 记录中止成因：超时/用户中断在 abort 前置位，供 AbortError 归因；缺省视为用户中断。
  let pendingPhase: StreamFailurePhase | null = null

  let timer: ReturnType<typeof setTimeout> | null = null
  function clearTimer(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  /** 到点即中断并按 phase 归因（首包/空闲超时 -> abort -> run 的 catch 归 model/server）。 */
  function armTimer(ms: number, phase: StreamFailurePhase): void {
    clearTimer()
    timer = setTimeout(() => abortWith(phase), ms)
  }

  function abortWith(phase: StreamFailurePhase): void {
    pendingPhase = phase
    controller.abort()
  }

  // 桥接外部信号（用户点「停止」）-> 内部 controller，标记为 abort（中性态、非失败）。
  if (signal) {
    if (signal.aborted) abortWith('abort')
    else signal.addEventListener('abort', () => abortWith('abort'), { once: true })
  }

  const done = run()
  return {
    abort: () => abortWith('abort'),
    done,
  }

  /** 主流程：开流 -> 读流拆帧 -> 归因终态。401 不重连，直接跳登录。 */
  async function run(): Promise<void> {
    // 首包超时须覆盖 fetch 建连 + 等 header 阶段：真实后端常「生成完才回 header」，
    // 若等拿到 body 再计时，此前的 pending 无人看管、会永久悬挂。故在 fetch 前就 arm。
    armTimer(env.aiFirstByteTimeout, 'firstByteTimeout')
    try {
      const response = await openStream()
      if (response.status === 401) {
        // session 失效：触发注入的 onUnauthorized（并发单飞去重）；流式不重连。
        if (!meta?.skipAuth) {
          runOnUnauthorized()
        }
        onError?.(resolveStreamError({ phase: 'httpError', status: 401 }))
        return
      }
      if (!response.ok) {
        onError?.(resolveStreamError({ phase: 'httpError', status: response.status }))
        return
      }
      if (!response.body) {
        // 无响应体（非预期）：不可归类失败，交 failed 兜底文案。
        onError?.(resolveStreamError({ phase: 'parse' }))
        return
      }
      onOpen?.()
      await readStream(response)
    } catch (error) {
      // AbortError：按 pendingPhase 归因（用户中断->aborted 中性；超时->model/server）。
      if (isAbortError(error)) {
        onError?.(resolveStreamError({ phase: pendingPhase ?? 'abort' }))
        return
      }
      // fetch reject（断网/DNS/连接失败）等 -> 网络类。
      onError?.(resolveStreamError({ phase: 'network' }))
    } finally {
      clearTimer()
    }
  }

  /** 开流；401 由上层 run 处理跳登录，本函数不再重连。 */
  async function openStream(): Promise<Response> {
    const url = buildUrl(meta)
    return fetch(url, {
      method: 'POST',
      headers: buildHeaders(meta?.skipAuth),
      body: JSON.stringify({ messages, ...meta?.extra }),
      signal: controller.signal,
      // 跨域场景下携带 HttpOnly Cookie（fetch 无 withCredentials，对应 credentials: 'include'）
      credentials: 'include',
    })
  }

  /** 读流：逐块读 -> 解析器拆帧 -> 分发回调；空闲超时按 chunk 到达重置。终态 onDone / onError。 */
  async function readStream(response: Response): Promise<void> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const protocol = (response.headers.get('content-type') ?? '').includes('ndjson')
      ? 'ndjson'
      : 'sse'
    const parser = createStreamParser(protocol)

    let full = ''
    let finished = false
    let streamError: StreamError | null = null

    /** 分发解析出的帧；返回 true 表示已达终态（done / error），应停止读流。 */
    const dispatch = (frames: ReturnType<typeof parser.push>): boolean => {
      for (const frame of frames) {
        switch (frame.kind) {
          case 'chunk':
            full += frame.delta
            onChunk?.(frame.delta)
            break
          case 'event':
            onEvent?.(frame.event)
            break
          case 'error':
            streamError = resolveStreamError({ phase: 'streamEvent', message: frame.message })
            return true
          case 'done':
            finished = true
            return true
        }
      }
      return false
    }

    try {
      while (!finished && !streamError) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) {
          // 后端关闭连接（未显式 [DONE]）：flush 结尾无分隔符的残留末帧后正常收流。
          dispatch(parser.push(decoder.decode()))
          dispatch(parser.flush())
          break
        }
        // 收到数据即重置为空闲超时：流中途 stall 上限 -> 归 timeoutServer（服务端仍在处理）。
        armTimer(env.aiIdleTimeout, 'idleTimeout')
        if (dispatch(parser.push(decoder.decode(value, { stream: true })))) break
      }
    } finally {
      clearTimer()
      // 任何退出路径都释放底层流，避免连接悬挂（cancel 对已结束的流幂等、安全）。
      void reader.cancel().catch(() => {})
    }

    if (streamError) {
      onError?.(streamError)
      return
    }
    onDone?.(full)
  }
}
