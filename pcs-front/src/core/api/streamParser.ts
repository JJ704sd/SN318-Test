/**
 * AI 流式帧解析（实施方案任务 5.1B；从 httpStream.ts 拆出以单一职责 + 可单测）
 *
 * 传输层逐块读到的文本，chunk 边界 ≠ 消息边界：用文本缓冲区累积、按协议拆帧——
 * SSE 按 `\n\n` 切事件取 `data:` 行、NDJSON 逐行 JSON，遇 `[DONE]` 收流。
 * 应对粘包（一次读到多帧）与半包（一帧被拆到多次读），解析为结构化 ParsedFrame。
 */

/** 结构化流内事件（工具调用 / 执行进度等），交由上层映射 executing/activeTool/execProgress。 */
export interface StreamEvent {
  type: string
  [key: string]: unknown
}

/** 解析出的帧：文本增量 / 结构化事件 / 流内错误 / 正常收流。 */
export type ParsedFrame =
  | { kind: 'chunk'; delta: string }
  | { kind: 'event'; event: StreamEvent }
  | { kind: 'error'; message?: string }
  | { kind: 'done' }

/** SSE / NDJSON 单帧 JSON 负载约定（模板契约，真实后端按此格式或在 parsePayload 适配）。 */
interface StreamFramePayload {
  /** 文本增量（首选字段）。 */
  delta?: string
  /** 文本增量（兼容 OpenAI 风格 content 字段）。 */
  content?: string
  /** 结构化事件。 */
  event?: StreamEvent
  /** 流内错误：message 须为面向用户的友好文案（非堆栈）。 */
  error?: { message?: string }
}

/** 传输协议：SSE（默认）或 NDJSON（逐行 JSON 备选）。 */
export type StreamProtocol = 'sse' | 'ndjson'

/** 有状态的增量解析器：push 追加文本产出已成帧，flush 收尾残留末帧。 */
export interface StreamParser {
  /** 追加一块解码后的文本，返回本次能完整解析出的帧（可能为空 / 多帧）。 */
  push: (text: string) => ParsedFrame[]
  /** 流结束时 flush 缓冲区残留的最后一帧（结尾无分隔符的情况）。 */
  flush: () => ParsedFrame[]
}

/** SSE data 行前缀。 */
const SSE_DATA_PREFIX = 'data:'
/** 正常收流哨兵。 */
const DONE_SENTINEL = '[DONE]'

/** 单帧 JSON 负载 → 帧：错误 > 事件 > 文本增量；非 JSON 容错为纯文本增量。 */
function parsePayload(data: string): ParsedFrame {
  let frame: StreamFramePayload
  try {
    frame = JSON.parse(data) as StreamFramePayload
  } catch {
    // 非 JSON：容错当作纯文本增量，避免半包 / 非标准帧崩解析
    return { kind: 'chunk', delta: data }
  }
  if (frame.error) return { kind: 'error', message: frame.error.message }
  if (frame.event) return { kind: 'event', event: frame.event }
  return { kind: 'chunk', delta: frame.delta ?? frame.content ?? '' }
}

/** 创建增量解析器。收到 done 帧后即封口，后续 push/flush 返回空。 */
export function createStreamParser(protocol: StreamProtocol): StreamParser {
  let buffer = ''
  let finished = false

  /** 收集一帧：done 置 finished；空 delta 丢弃（不触发无意义的 onChunk('')）。 */
  const collect = (out: ParsedFrame[], frame: ParsedFrame): void => {
    if (frame.kind === 'chunk' && frame.delta === '') return
    out.push(frame)
    if (frame.kind === 'done') finished = true
  }

  /** SSE 单事件块 → 帧：取 data: 行拼值，[DONE] 为 done；无 data 行返回 null。 */
  const parseSseEvent = (rawEvent: string): ParsedFrame | null => {
    const dataLines = rawEvent
      .split('\n')
      .filter((line) => line.startsWith(SSE_DATA_PREFIX))
      .map((line) => line.slice(SSE_DATA_PREFIX.length).replace(/^ /, ''))
    if (dataLines.length === 0) return null
    const data = dataLines.join('\n')
    if (data === DONE_SENTINEL) return { kind: 'done' }
    return parsePayload(data)
  }

  /** 处理 NDJSON 单行：[DONE] 为 done，否则解析负载；空行忽略。 */
  const parseNdjsonLine = (out: ParsedFrame[], line: string): void => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed === DONE_SENTINEL) {
      collect(out, { kind: 'done' })
      return
    }
    collect(out, parsePayload(trimmed))
  }

  const drainSse = (out: ParsedFrame[]): void => {
    let idx: number
    while (!finished && (idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const frame = parseSseEvent(rawEvent)
      if (frame) collect(out, frame)
    }
  }

  const drainNdjson = (out: ParsedFrame[]): void => {
    let idx: number
    while (!finished && (idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 1)
      parseNdjsonLine(out, line)
    }
  }

  return {
    push(text: string): ParsedFrame[] {
      if (finished) return []
      buffer += text
      const out: ParsedFrame[] = []
      if (protocol === 'ndjson') drainNdjson(out)
      else drainSse(out)
      return out
    },
    flush(): ParsedFrame[] {
      if (finished) return []
      const rest = buffer
      buffer = ''
      const out: ParsedFrame[] = []
      if (rest.trim() === '') return out
      if (protocol === 'ndjson') {
        for (const line of rest.split('\n')) {
          if (finished) break
          parseNdjsonLine(out, line)
        }
      } else {
        const frame = parseSseEvent(rest)
        if (frame) collect(out, frame)
      }
      return out
    },
  }
}
