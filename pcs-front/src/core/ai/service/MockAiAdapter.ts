/**
 * MockAiAdapter —— AiService 的默认 Mock 适配器（实施方案任务 4.2）
 *
 * 用本地假数据 + setTimeout 模拟流式输出与网络延迟，作为模板开箱即用的默认 AI 后端。
 * 全程不发起任何真实网络请求。三步链红线与接口保持一致：
 * requestSuggestions 只产出建议，confirmAndExecute 只执行已确认动作。
 */

import { AiAbortError } from './AiAbortError'
import { BaseAiService } from './AiService'

import type {
  AiAction,
  AiActionResult,
  AiMessage,
  AiSendMessageOptions,
  AiSendMessageResult,
  AiSuggestion,
  AiSuggestionRequest,
} from './types'

export { AiAbortError } from './AiAbortError'

/** 连接/排队阶段延迟（ms）：模拟「请求中」，onStart 后才进入「思考中」，让 requesting 态可呈现 */
const CONNECT_DELAY = 360
/** 流式逐字输出的字符间隔（ms） */
const STREAM_CHAR_DELAY = 24
/** requestSuggestions 模拟延迟（ms） */
const SUGGESTION_DELAY = 480
/** confirmAndExecute 模拟延迟（ms） */
const EXECUTE_DELAY = 640

// Mock 数据已拆分独立数据模块（S4-B）：对话库/建议库/NL 解析仅在对应方法首次
// 调用时动态 import（Promise 缓存，避免并发首调重复拉取），不随适配器静态携带。
let repliesLoader: Promise<typeof import('./mock-data/replies')> | undefined
function loadReplies(): Promise<typeof import('./mock-data/replies')> {
  repliesLoader ??= import('./mock-data/replies')
  return repliesLoader
}

let suggestionsLoader: Promise<typeof import('./mock-data/suggestions')> | undefined
function loadSuggestions(): Promise<typeof import('./mock-data/suggestions')> {
  suggestionsLoader ??= import('./mock-data/suggestions')
  return suggestionsLoader
}

let nlFilterLoader: Promise<typeof import('./mock-data/nl-filter')> | undefined
function loadNlFilter(): Promise<typeof import('./mock-data/nl-filter')> {
  nlFilterLoader ??= import('./mock-data/nl-filter')
  return nlFilterLoader
}

let messageSeq = 0
/** 生成对话消息的唯一 id（模块级自增，避免与预设建议 id 冲突） */
function nextMessageId(): string {
  messageSeq += 1
  return `msg-${Date.now()}-${messageSeq}`
}

/** 可被 AbortSignal 打断的延迟；中断时 reject(AiAbortError) */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AiAbortError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new AiAbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export class MockAiAdapter extends BaseAiService {
  /** 流式逐字返回预设回复：先连接延迟(requesting)→onStart(thinking)→逐字 onChunk(streaming)→done */
  async sendMessage(options: AiSendMessageOptions): Promise<AiSendMessageResult> {
    const { content, onStart, onChunk, signal } = options
    const { pickReply } = await loadReplies()
    const reply = pickReply(content)
    const chars = Array.from(reply.text)

    // 连接/排队阶段：此间为「请求中」，结束后触发 onStart 进入「思考中」
    await delay(CONNECT_DELAY, signal)
    onStart?.()

    let streamed = ''
    for (let i = 0; i < chars.length; i += 1) {
      await delay(STREAM_CHAR_DELAY, signal)
      const char = chars[i]!
      streamed += char
      onChunk?.({ delta: char, done: false })
    }
    onChunk?.({ delta: '', done: true })

    const message: AiMessage = {
      id: nextMessageId(),
      role: 'assistant',
      content: streamed,
      streaming: false,
      createdAt: Date.now(),
    }
    // suggestion 含 action 时仅为建议，须经用户确认后走 confirmAndExecute
    return reply.suggestion ? { message, suggestion: reply.suggestion } : { message }
  }

  /** 按场景 key 返回预设建议列表；未命中场景返回空数组。只读，无副作用。 */
  async requestSuggestions(request: AiSuggestionRequest): Promise<AiSuggestion[]> {
    // 连接阶段(requesting)结束后触发 onStart 进入「思考中」，再产出建议
    await delay(CONNECT_DELAY, request.signal)
    request.onStart?.()
    await delay(SUGGESTION_DELAY, request.signal)

    // 自然语言筛选场景：按输入文本动态解析为结构化条件建议（任务 5.3A）
    if (request.scene === 'list.nl-filter') {
      const text = (request.context?.text as string | undefined) ?? ''
      const { pickNlFilterSuggestion } = await loadNlFilter()
      return pickNlFilterSuggestion(text)
    }

    const { MOCK_SUGGESTIONS } = await loadSuggestions()
    return MOCK_SUGGESTIONS[request.scene] ?? []
  }

  /** 模拟延迟后返回成功结果。仅执行【已确认】动作，回显 action 信息供 UI 反馈。 */
  async confirmAndExecute<TData = unknown>(
    action: AiAction,
  ): Promise<AiActionResult<TData>> {
    await delay(EXECUTE_DELAY)
    return {
      success: true,
      data: { type: action.type, payload: action.payload } as TData,
    }
  }
}
