import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSendMessageOptions, AiSendMessageResult } from './types'
import { useAiService } from './useAiService'

const { service, getAiServiceMock } = vi.hoisted(() => {
  const service = {
    sendMessage: vi.fn<(options: AiSendMessageOptions) => Promise<AiSendMessageResult>>(),
  }
  return { service, getAiServiceMock: vi.fn<() => object>(() => service) }
})

vi.mock('./index', () => ({ getAiService: getAiServiceMock }))

function result(content: string): AiSendMessageResult {
  return { message: { id: 'ai-1', role: 'assistant', content, createdAt: 0 } }
}

describe('useAiService', () => {
  beforeEach(() => {
    service.sendMessage.mockReset()
  })

  it('空白输入不发送', async () => {
    const ai = useAiService()
    await expect(ai.send('   ')).resolves.toBeNull()
    expect(service.sendMessage).not.toHaveBeenCalled()
  })

  it('发送成功：追加用户消息并写入流式结果', async () => {
    service.sendMessage.mockResolvedValue(result('完整回复'))
    const ai = useAiService()
    const res = await ai.send('你好')
    expect(service.sendMessage).toHaveBeenCalledTimes(1)
    expect(ai.messages.value.filter((m) => m.role === 'user')).toHaveLength(1)
    const assistant = ai.messages.value.find((m) => m.role === 'assistant')
    expect(assistant?.content).toBe('完整回复')
    expect(assistant?.streaming).toBe(false)
    expect(res).toEqual(result('完整回复'))
    expect(ai.sending.value).toBe(false)
  })

  it('onChunk 流式增量拼接', async () => {
    service.sendMessage.mockImplementation(async ({ onChunk }: AiSendMessageOptions) => {
      onChunk?.({ done: false, delta: 'Hello' })
      onChunk?.({ done: false, delta: ' world' })
      return result('Hello world')
    })
    const ai = useAiService()
    await ai.send('hi')
    const assistant = ai.messages.value.find((m) => m.role === 'assistant')
    expect(assistant?.content).toBe('Hello world')
  })

  it('sending 期间重复发送返回 null', async () => {
    let resolveSend!: (r: AiSendMessageResult) => void
    service.sendMessage.mockReturnValue(new Promise((r) => { resolveSend = r }))
    const ai = useAiService()
    const p = ai.send('第一次')
    expect(ai.sending.value).toBe(true)
    const dup = await ai.send('第二次')
    expect(dup).toBeNull()
    expect(service.sendMessage).toHaveBeenCalledTimes(1)
    resolveSend(result('ok'))
    await p
    expect(ai.sending.value).toBe(false)
  })

  it('发送抛错后流式与 sending 状态复位', async () => {
    service.sendMessage.mockRejectedValue(new Error('LLM 挂了'))
    const ai = useAiService()
    await expect(ai.send('x')).rejects.toThrow('LLM 挂了')
    const assistant = ai.messages.value.find((m) => m.role === 'assistant')
    expect(assistant?.streaming).toBe(false)
    expect(ai.sending.value).toBe(false)
  })

  it('clear 清空消息', async () => {
    service.sendMessage.mockResolvedValue(result('ok'))
    const ai = useAiService()
    await ai.send('hi')
    expect(ai.messages.value.length).toBeGreaterThan(0)
    ai.clear()
    expect(ai.messages.value).toEqual([])
  })
})
