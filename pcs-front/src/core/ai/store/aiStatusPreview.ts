import type { AiAction, AiMessage, AiSuggestion } from '@core/ai/service/types'
import type { AiStatus } from './aiStatus'
import type { DisplayChain } from './aiStatusChain'

export const STATUS_PREVIEW_MESSAGE_ID = 'ai-status-preview'
const STATUS_PREVIEW_CONTENT = '已找到 12 条相关运单，其中 3 条超过承诺时效。'
const STATUS_PREVIEW_ACTION: AiAction = {
  type: 'send-delay-notice',
  payload: { count: 3 },
  requireConfirm: false,
  description: '向客户发送「预计延迟到达」通知',
}
const STATUS_PREVIEW_SUGGESTION: AiSuggestion = {
  id: 'ai-status-preview-suggestion',
  title: '按渠道分组处理超时运单',
  description: '已找到 12 条超时运单，建议按渠道分组处理。',
  action: STATUS_PREVIEW_ACTION,
  riskLevel: 'low',
  evidence: [{ label: '超时运单', value: '12 条', source: '运单列表' }],
}

/** 状态预览所读写的 store 响应式字段子集。 */
export interface StatusPreviewScope {
  messages: { value: AiMessage[] }
  chatSuggestion: { value: AiSuggestion | null }
  chatSuggestions: { value: Record<string, AiSuggestion> }
  pendingAction: { value: AiAction | null }
  pendingSuggestion: { value: AiSuggestion | null }
  errorReason: { value: string | null }
  execProgress: { value: string | null }
  activeTool: { value: string | null }
}

export interface StatusPreviewCtx {
  scope: StatusPreviewScope
  chain: DisplayChain
  /** 有进行中请求时不预览，避免覆盖真实会话。 */
  isBusy: () => boolean
}

/** 移除上一条状态预览消息及其挂载的建议。 */
export function clearStatusPreviewMessage(ctx: StatusPreviewCtx): void {
  ctx.scope.messages.value = ctx.scope.messages.value.filter(
    (message) => message.id !== STATUS_PREVIEW_MESSAGE_ID,
  )
  delete ctx.scope.chatSuggestions.value[STATUS_PREVIEW_MESSAGE_ID]
}

/**
 * 状态预览展示：仅切换展示数据，不调用接口、不执行动作。
 * 每次替换上一条预览消息，正常会话历史保持不变。
 */
export function applyStatusPreview(
  ctx: StatusPreviewCtx,
  nextStatus: Exclude<AiStatus, 'idle'>,
): void {
  if (ctx.isBusy()) return
  const { scope, chain } = ctx
  clearStatusPreviewMessage(ctx)
  scope.chatSuggestion.value = null
  scope.pendingAction.value = null
  scope.pendingSuggestion.value = null
  scope.errorReason.value = null
  scope.execProgress.value = null
  scope.activeTool.value = null

  const previewMessage: AiMessage = {
    id: STATUS_PREVIEW_MESSAGE_ID,
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
  }

  if (nextStatus === 'streaming' || nextStatus === 'aborted') {
    previewMessage.content = STATUS_PREVIEW_CONTENT
  } else if (nextStatus === 'done') {
    previewMessage.content = '已找到 12 条超时运单，建议按渠道分组处理。'
    scope.chatSuggestion.value = STATUS_PREVIEW_SUGGESTION
  } else if (nextStatus === 'awaitingUser') {
    previewMessage.content = '我将向客户发送「预计延迟到达」通知。'
    scope.pendingAction.value = STATUS_PREVIEW_ACTION
    scope.pendingSuggestion.value = STATUS_PREVIEW_SUGGESTION
  } else if (nextStatus === 'executing') {
    scope.activeTool.value = '物流轨迹查询'
    scope.execProgress.value = '正在查询运单轨迹… 第 2 / 3 步'
  } else if (nextStatus === 'failed') {
    scope.errorReason.value = 'AI 处理失败，请稍后重试。'
  }

  if (nextStatus === 'streaming') previewMessage.streaming = true
  scope.messages.value.push(previewMessage)
  if (nextStatus === 'done') {
    scope.chatSuggestions.value[previewMessage.id] = STATUS_PREVIEW_SUGGESTION
  }
  chain.setStatusImmediately(nextStatus)
}
