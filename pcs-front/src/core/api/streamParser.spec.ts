import { describe, it, expect } from 'vitest'
import { createStreamParser, type ParsedFrame } from './streamParser'

/** 把帧序列里的文本增量拼成完整字符串，便于断言。 */
function fullText(frames: ParsedFrame[]): string {
  return frames
    .filter((f): f is Extract<ParsedFrame, { kind: 'chunk' }> => f.kind === 'chunk')
    .map((f) => f.delta)
    .join('')
}

describe('streamParser · SSE 拆帧（任务 5.1B）', () => {
  it('逐帧 → [DONE]：产出增量并以 done 收流', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"delta":"运"}\n\ndata: {"delta":"单"}\n\ndata: [DONE]\n\n')
    expect(fullText(frames)).toBe('运单')
    expect(frames.at(-1)).toEqual({ kind: 'done' })
  })

  it('粘包：一次 push 含多帧', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"delta":"A"}\n\ndata: {"delta":"B"}\n\n')
    expect(fullText(frames)).toBe('AB')
  })

  it('半包：一帧被拆到两次 push，跨块正确拼接', () => {
    const parser = createStreamParser('sse')
    const first = parser.push('data: {"del')
    expect(first).toEqual([]) // 半帧未成形，不产出
    const second = parser.push('ta":"跨块"}\n\n')
    expect(fullText(second)).toBe('跨块')
  })

  it('多行 data: 用 \\n 拼接为单帧负载', () => {
    const parser = createStreamParser('sse')
    // 两行 data 拼成 {"delta":"x"} 这一个 JSON
    const frames = parser.push('data: {"delta":\ndata: "x"}\n\n')
    expect(fullText(frames)).toBe('x')
  })

  it('data: 后仅去一个前导空格（保留内容内空格）', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"delta":" 前导保留"}\n\n')
    expect(fullText(frames)).toBe(' 前导保留')
  })

  it('结构化事件走 event 帧，不混入文本', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"event":{"type":"tool","name":"q"}}\n\n')
    expect(frames).toEqual([{ kind: 'event', event: { type: 'tool', name: 'q' } }])
  })

  it('流内 error 帧携带后端文案', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"error":{"message":"额度不足"}}\n\n')
    expect(frames).toEqual([{ kind: 'error', message: '额度不足' }])
  })

  it('兼容 OpenAI 风格 content 字段', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"content":"hi"}\n\n')
    expect(fullText(frames)).toBe('hi')
  })

  it('空 delta 帧被丢弃，不产出空 chunk', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: {"delta":""}\n\n')
    expect(frames).toEqual([])
  })

  it('非 JSON data 容错为纯文本增量', () => {
    const parser = createStreamParser('sse')
    const frames = parser.push('data: 纯文本\n\n')
    expect(fullText(frames)).toBe('纯文本')
  })

  it('flush：结尾无 \\n\\n 的残留末帧不丢失', () => {
    const parser = createStreamParser('sse')
    const pushed = parser.push('data: {"delta":"半截"}') // 无分隔符
    expect(pushed).toEqual([])
    const flushed = parser.flush()
    expect(fullText(flushed)).toBe('半截')
  })

  it('收到 done 后 push/flush 封口不再产出', () => {
    const parser = createStreamParser('sse')
    parser.push('data: [DONE]\n\n')
    expect(parser.push('data: {"delta":"late"}\n\n')).toEqual([])
    expect(parser.flush()).toEqual([])
  })
})

describe('streamParser · NDJSON 拆帧（任务 5.1B）', () => {
  it('逐行 JSON → [DONE] 收流', () => {
    const parser = createStreamParser('ndjson')
    const frames = parser.push('{"delta":"x"}\n{"delta":"y"}\n[DONE]\n')
    expect(fullText(frames)).toBe('xy')
    expect(frames.at(-1)).toEqual({ kind: 'done' })
  })

  it('半行跨块拼接', () => {
    const parser = createStreamParser('ndjson')
    expect(parser.push('{"delta":"a')).toEqual([])
    expect(fullText(parser.push('b"}\n'))).toBe('ab')
  })

  it('flush 处理结尾无换行的末行', () => {
    const parser = createStreamParser('ndjson')
    expect(parser.push('{"delta":"end"}')).toEqual([])
    expect(fullText(parser.flush())).toBe('end')
  })

  it('空行忽略', () => {
    const parser = createStreamParser('ndjson')
    const frames = parser.push('\n{"delta":"z"}\n\n')
    expect(fullText(frames)).toBe('z')
  })
})
