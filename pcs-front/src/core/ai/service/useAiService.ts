/**
 * useAiService —— AI 服务 composable（实施方案任务 4.4）
 *
 * 供 Vue 组件获取当前 AiService 实例并封装常用调用（响应式消息列表、发送中状态）。
 * UI 层只依赖本 composable / 统一出口，【不直接 import 具体适配器】。
 *
 * 注：这是对 service 实例的轻量封装（本地响应式状态）；跨页面的全局对话状态机由
 * ai store（任务 4.5）承载，store 内部同样经统一出口获取 service。
 */

import { ref, shallowRef } from 'vue'
import { getAiService } from './index'
import type { AiMessage, AiSendMessageResult } from './types'

/** 生成本地消息 id */
let localSeq = 0
function nextLocalId(): string {
  localSeq += 1
  return `local-${Date.now()}-${localSeq}`
}

export function useAiService() {
  // service 实例无需深层响应，用 shallowRef 持有
  const service = shallowRef(getAiService())

  const messages = ref<AiMessage[]>([])
  const sending = ref(false)

  /**
   * 发送一条用户消息并流式接收 AI 回复。
   * 先追加用户消息与占位的 assistant 消息，再随 onChunk 增量拼接回复内容。
   */
  async function send(content: string): Promise<AiSendMessageResult | null> {
    const text = content.trim()
    if (!text || sending.value) return null

    sending.value = true
    messages.value.push({
      id: nextLocalId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    })

    const assistant: AiMessage = {
      id: nextLocalId(),
      role: 'assistant',
      content: '',
      streaming: true,
      createdAt: Date.now(),
    }
    messages.value.push(assistant)

    try {
      const result = await service.value.sendMessage({
        content: text,
        history: messages.value.slice(0, -1),
        onChunk: (chunk) => {
          if (!chunk.done) assistant.content += chunk.delta
        },
      })
      assistant.content = result.message.content
      assistant.streaming = false
      return result
    } finally {
      assistant.streaming = false
      sending.value = false
    }
  }

  /** 清空本地消息 */
  function clear(): void {
    messages.value = []
  }

  return {
    service,
    messages,
    sending,
    send,
    clear,
  }
}
