/**
 * AI 服务注册契约测试：registerAiService/getAiService。
 * S4-C 起未注册调用 getAiService() 抛明确初始化错误（不再回落 Mock）；
 * 注册后返回实例且可重复注册覆盖。
 */
import { describe, expect, it, vi } from 'vitest'
import { getAiService, registerAiService } from './index'
import type { AiService } from './AiService'

describe('AI service 注册契约（S4-C：未注册抛错，不再回落 Mock）', () => {
  it('未注册时 getAiService() 抛出明确初始化错误', () => {
    expect(() => getAiService()).toThrow(/registerAiService/)
  })

  it('registerAiService 后返回注册实例，可重复注册覆盖', () => {
    const stubA: AiService = {
      sendMessage: vi.fn<AiService['sendMessage']>(),
      requestSuggestions: vi.fn<AiService['requestSuggestions']>(),
      confirmAndExecute: vi.fn<AiService['confirmAndExecute']>(),
    }
    registerAiService(stubA)
    expect(getAiService()).toBe(stubA)

    const stubB: AiService = {
      sendMessage: vi.fn<AiService['sendMessage']>(),
      requestSuggestions: vi.fn<AiService['requestSuggestions']>(),
      confirmAndExecute: vi.fn<AiService['confirmAndExecute']>(),
    }
    registerAiService(stubB)
    expect(getAiService()).toBe(stubB)
  })
})
