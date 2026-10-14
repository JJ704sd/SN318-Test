import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getAiService } from '@core/ai/service'
import type { AiAction, AiMessage, AiSuggestion } from '@core/ai/service/types'
import { nextMsgId, type AiStatus, type AiTimeoutKind } from './aiStatus'
import { createDisplayChain } from './aiStatusChain'
import {
  applyStatusPreview,
  clearStatusPreviewMessage,
  type StatusPreviewScope,
  type StatusPreviewCtx,
} from './aiStatusPreview'
import {
  createTaskExec,
  type TaskExecScope,
} from './aiTaskExec'
import { createStatusControl, type StatusControlCtx } from './aiStatusControl'

// 展示链配置注入与状态机契约：由本模块再导出，保持 ./ai 既有引用路径（含 spec 与 store/index）不变。
export { configureAiStatusTiming } from './aiStatusChain'
export type { AiStatus, AiTimeoutKind }

export const useAiStore = defineStore('ai', () => {
  // ── state ──
  const messages = ref<AiMessage[]>([])
  const suggestions = ref<AiSuggestion[]>([])
  /** 对话回复附带的待采纳建议；采纳后才进入 pendingAction 授权环节。 */
  const chatSuggestion = ref<AiSuggestion | null>(null)
  /** 按 AI 消息保存尚未处理的建议，使历史消息与其操作按钮作为整体保留。 */
  const chatSuggestions = ref<Record<string, AiSuggestion>>({})
  /** 待用户确认的动作；仅 confirmExecute 后才真正执行。null=无待确认 */
  const pendingAction = ref<AiAction | null>(null)
  // 待确认动作关联的完整建议（title/evidence 等可解释信息），供 AiActionBar 直接取用，
  // 避免靠引用相等反查 suggestions——对话式动作不在该数组（AI 非黑盒红线）。
  const pendingSuggestion = ref<AiSuggestion | null>(null)
  const assistantOpen = ref(false)

  const status = ref<AiStatus>('idle')
  /** 失败/超时的原因文案（面向用户，不含堆栈/错误码） */
  const errorReason = ref<string | null>(null)
  /** 执行进度，如「正在查询运单…第 2/3 步」 */
  const execProgress = ref<string | null>(null)
  /** 当前调用的工具名 */
  const activeTool = ref<string | null>(null)

  // 当前请求的中断句柄；发送/建议/执行时创建，abort() 触发
  const controller = shallowRef<AbortController | null>(null)
  const service = shallowRef(getAiService())

  // 状态展示链：负责排队切换展示态、done 回落与最小展示时长（契约见 ./aiStatusChain）
  const chain = createDisplayChain({ status, holdDone: () => Boolean(chatSuggestion.value) })

  // ── 状态预览：展示逻辑独立到 aiStatusPreview，此处仅做字段接线 ──
  const previewScope: StatusPreviewScope = {
    messages,
    chatSuggestion,
    chatSuggestions,
    pendingAction,
    pendingSuggestion,
    errorReason,
    execProgress,
    activeTool,
  }
  const previewCtx: StatusPreviewCtx = {
    scope: previewScope,
    chain,
    isBusy: () => Boolean(controller.value),
  }
  function previewStatus(nextStatus: Exclude<AiStatus, 'idle'>): void {
    applyStatusPreview(previewCtx, nextStatus)
  }

  // ── 展示态切换（异常/中断/超时）：独立到 aiStatusControl ──
  const statusControlCtx: StatusControlCtx = {
    scope: { status, errorReason },
    chain,
    abortRequest: () => controller.value?.abort(),
  }
  const { applyServiceError, abort, handleTimeout, continueWaiting } =
    createStatusControl(statusControlCtx)

  // ── 任务确认/执行链：三步链「确认 → 执行」独立到 aiTaskExec ──
  const taskScope: TaskExecScope = {
    pendingAction,
    pendingSuggestion,
    activeTool,
    execProgress,
    errorReason,
    status,
  }
  const { proposeAction, confirmExecute, cancelAction } = createTaskExec({
    scope: taskScope,
    chain,
    service: () => service.value,
    handleError: applyServiceError,
  })

  // ── 生成链路 ──

  /** 发送对话消息：requesting → thinking → streaming → done；流式增量追加占位消息，中断落 aborted。 */
  async function sendMessage(content: string): Promise<void> {
    const text = content.trim()
    if (!text) return

    clearStatusPreviewMessage(previewCtx)
    errorReason.value = null
    chatSuggestion.value = null
    pendingAction.value = null
    pendingSuggestion.value = null
    controller.value = new AbortController()

    messages.value.push({
      id: nextMsgId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    })
    messages.value.push({
      id: nextMsgId(),
      role: 'assistant',
      content: '',
      streaming: true,
      createdAt: Date.now(),
    })
    // 必须从响应式数组取回代理对象再写入增量；若持有 push 前的原始对象，
    // 后续 chunk 虽然会改到数据，却不会触发对话气泡重新渲染。
    const assistant = messages.value.at(-1)!
    const chainId = chain.beginStatusChain('requesting')
    let thinkingQueued = false
    let streamingQueued = false

    function queueThinking(): void {
      if (thinkingQueued) return
      thinkingQueued = true
      void chain.queueStatus('thinking', chainId)
    }

    // 置 requesting 后不立即切 thinking：由适配器 onStart 在真实「进入处理」时机触发，
    // 否则同步跳到 thinking 会让 requesting 态（灰色信号波纹）永远渲染不出来。
    try {
      const result = await service.value.sendMessage({
        content: text,
        history: messages.value.slice(0, -1),
        signal: controller.value.signal,
        onStart: queueThinking,
        onChunk: (chunk) => {
          if (chunk.done) return
          // 首个增量到达时保证思考态已入队，再进入生成态；后续 chunk 不重复排队。
          queueThinking()
          if (!streamingQueued) {
            streamingQueued = true
            void chain.queueStatus('streaming', chainId)
          }
          assistant.content += chunk.delta
        },
      })
      assistant.content = result.message.content
      // 回复携带动作建议时先停在「采纳建议 / 忽略」；采纳后才进入授权确认。
      const replySuggestion = result.suggestion?.action ? result.suggestion : null
      chatSuggestion.value = replySuggestion
      // 没有流式 chunk 的适配器也需呈现生成态，再进入完成态。
      if (!streamingQueued) {
        queueThinking()
        streamingQueued = true
        void chain.queueStatus('streaming', chainId)
      }
      await chain.settleDone(chainId)
      if (replySuggestion) chatSuggestions.value[assistant.id] = replySuggestion
      assistant.streaming = false
    } catch (err) {
      assistant.streaming = false
      applyServiceError(err, 'AI 服务异常，请稍后重试')
    } finally {
      controller.value = null
    }
  }

  /** 按场景请求建议：requesting → thinking → 填充 suggestions → done；不执行任何动作。 */
  async function fetchSuggestions(
    scene: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    errorReason.value = null
    controller.value = new AbortController()
    const chainId = chain.beginStatusChain('requesting')
    let thinkingQueued = false

    // 同 sendMessage：requesting 由 onStart 在真实进入处理时才切 thinking
    try {
      suggestions.value = await service.value.requestSuggestions({
        scene,
        context,
        signal: controller.value.signal,
        onStart: () => {
          if (thinkingQueued) return
          thinkingQueued = true
          void chain.queueStatus('thinking', chainId)
        },
      })
      if (!thinkingQueued) {
        thinkingQueued = true
        void chain.queueStatus('thinking', chainId)
      }
      await chain.settleDone(chainId)
    } catch (err) {
      applyServiceError(err, 'AI 分析失败，请稍后重试')
    } finally {
      controller.value = null
    }
  }

  // ── 对话建议处理 ──

  function removeMessageSuggestion(suggestion: AiSuggestion, messageId?: string): void {
    if (messageId) {
      delete chatSuggestions.value[messageId]
      return
    }
    const entry = Object.entries(chatSuggestions.value).find(
      ([, item]) => item.id === suggestion.id,
    )
    if (entry) delete chatSuggestions.value[entry[0]]
  }

  /** 采纳本轮对话建议：仅进入授权确认，不直接执行。 */
  function acceptChatSuggestion(messageId?: string): void {
    const suggestion = messageId
      ? chatSuggestions.value[messageId]
      : chatSuggestion.value
    if (!suggestion?.action) return
    removeMessageSuggestion(suggestion, messageId)
    if (chatSuggestion.value?.id === suggestion.id) chatSuggestion.value = null
    proposeAction(suggestion.action, suggestion)
  }

  /** 忽略本轮对话建议并回到可继续输入的空闲态。 */
  function ignoreChatSuggestion(messageId?: string): void {
    const suggestion = messageId
      ? chatSuggestions.value[messageId]
      : chatSuggestion.value
    if (!suggestion) return
    removeMessageSuggestion(suggestion, messageId)
    if (chatSuggestion.value?.id === suggestion.id) chatSuggestion.value = null
    if (status.value === 'done' && !chatSuggestion.value) resetStatus()
  }

  /** 助手开合切换 */
  function toggleAssistant(): void {
    assistantOpen.value = !assistantOpen.value
  }

  /** 复位状态到 idle，清理异常/进度标记（保留消息与建议） */
  function resetStatus(): void {
    chain.clearDoneTimer()
    chain.setStatusImmediately('idle')
    errorReason.value = null
    execProgress.value = null
    activeTool.value = null
  }

  return {
    messages,
    suggestions,
    chatSuggestion,
    chatSuggestions,
    pendingAction,
    pendingSuggestion,
    assistantOpen,
    status,
    errorReason,
    execProgress,
    activeTool,
    sendMessage,
    fetchSuggestions,
    acceptChatSuggestion,
    ignoreChatSuggestion,
    proposeAction,
    confirmExecute,
    cancelAction,
    abort,
    handleTimeout,
    continueWaiting,
    previewStatus,
    toggleAssistant,
    resetStatus,
  }
})
