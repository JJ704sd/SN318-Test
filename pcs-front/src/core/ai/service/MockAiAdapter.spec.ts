/**
 * MockAiAdapter 行为回归（S4-B：数据拆分 + 动态加载后）。
 *
 * Mock 回复/建议数据已拆入 mock-data/{replies,suggestions,nl-filter}，由方法首次调用时
 * 动态 import。本 spec 锁定拆后行为不回退：sendMessage 流式逐字、requestSuggestions
 * 场景建议与 NL 解析均与拆分前一致。
 * 适配器内置真实 setTimeout 延迟（单个用例 <2s，直接等待，不用 fake timers——
 * fake clock 与真实动态 import 的时机竞争会让首段 await import 后注册的 timer 落在已推进的虚拟时刻而永不触发）。
 */
import { describe, expect, it } from 'vitest'
import { MockAiAdapter } from './MockAiAdapter'
import type { AiStreamHandler, AiSuggestion } from './types'

describe('MockAiAdapter（数据延迟加载后）', () => {
  it('sendMessage 逐字流式返回命中关键词的预设回复，onStart/done 正常', async () => {
    const adapter = new MockAiAdapter()
    const chunks: string[] = []
    let done = false
    let started = false
    const onChunk: AiStreamHandler = (chunk) => {
      if (chunk.done) {
        done = true
        return
      }
      chunks.push(chunk.delta)
    }

    const result = await adapter.sendMessage({
      content: '你好',
      onStart: () => {
        started = true
      },
      onChunk,
    })

    expect(started).toBe(true)
    expect(done).toBe(true)
    expect(chunks.join('')).toBe(result.message.content)
    expect(result.message.streaming).toBe(false)
    // 命中问候库，非缺省回复
    expect(result.message.content).toContain('运小星')
    expect(result.suggestion).toBeUndefined()
  })

  it('sendMessage 回复携带 suggestion（含 action）时随结果返回', async () => {
    const adapter = new MockAiAdapter()
    const result = await adapter.sendMessage({ content: '帮我批量发货' })

    expect(result.suggestion?.action?.type).toBe('batch-update-status')
    expect(result.suggestion?.action?.requireConfirm).toBe(true)
  })

  it('requestSuggestions 按场景返回预设建议（携 action）', async () => {
    const adapter = new MockAiAdapter()
    const suggestions: AiSuggestion[] = await adapter.requestSuggestions({
      scene: 'list.batch-operation',
    })

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!.action?.type).toBe('batch-update-status')
    expect(suggestions[0]!.riskLevel).toBe('high')
  })

  it('requestSuggestions NL 场景按文本解析结构化条件', async () => {
    const adapter = new MockAiAdapter()
    const suggestions: AiSuggestion[] = await adapter.requestSuggestions({
      scene: 'list.nl-filter',
      context: { text: '帮我查近30天快递运输中的运单' },
    })

    expect(suggestions).toHaveLength(1)
    const payload = suggestions[0]!.action?.payload as {
      bizType?: string
      status?: string
      dateRange?: [string, string]
    }
    expect(payload.bizType).toBe('express')
    expect(payload.status).toBe('in_transit')
    expect(payload.dateRange).toBeDefined()
    expect(payload.dateRange?.[1]).toBeDefined()
  })

  it('requestSuggestions 未命中场景返回空数组', async () => {
    const adapter = new MockAiAdapter()
    const suggestions = await adapter.requestSuggestions({ scene: 'no.such.scene' })
    expect(suggestions).toEqual([])
  })
})
