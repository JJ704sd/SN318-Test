import type { Ref } from 'vue'
import type { AiService } from '@core/ai/service'
import type { AiAction, AiSuggestion } from '@core/ai/service/types'
import type { AiStatus } from './aiStatus'
import type { DisplayChain } from './aiStatusChain'

/** 任务确认/执行链所读写的 store 字段子集。 */
export interface TaskExecScope {
  pendingAction: Ref<AiAction | null>
  pendingSuggestion: Ref<AiSuggestion | null>
  activeTool: Ref<string | null>
  execProgress: Ref<string | null>
  errorReason: Ref<string | null>
  status: Ref<AiStatus>
}

export interface TaskExecCtx {
  scope: TaskExecScope
  chain: DisplayChain
  /** 惰性取当前适配器（store 的 shallowRef）。 */
  service: () => AiService
  /** 异常归一落态：store 的 applyServiceError。 */
  handleError: (error: unknown, fallback: string) => void
}

/**
 * 三步链的「确认 → 执行」环节：采纳建议/动作后先进入待确认（awaitingUser），
 * 用户确认后才真正执行（executing），确认前不调用任何接口（三步链红线）。
 */
export function createTaskExec(ctx: TaskExecCtx) {
  const { scope, chain, service, handleError } = ctx

  /**
   * 把建议/动作转为待确认【仅进入待确认】：置 awaitingUser、写 pendingAction，
   * 不执行、不进 executing。suggestion 为关联完整建议（title/evidence），供 AiActionBar 取用。
   */
  function proposeAction(action: AiAction, suggestion?: AiSuggestion): void {
    chain.clearDoneTimer()
    scope.pendingAction.value = action
    scope.pendingSuggestion.value = suggestion ?? null
    chain.setStatusImmediately('awaitingUser')
  }

  /**
   * 用户确认后才执行 pendingAction：置 executing、维护 execProgress/activeTool，
   * 成功 → done 短暂后回 idle，失败 → failed 并写 errorReason。
   */
  async function confirmExecute(): Promise<void> {
    const action = scope.pendingAction.value
    if (!action) return

    scope.errorReason.value = null
    const chainId = chain.beginStatusChain('executing')
    scope.activeTool.value = action.type
    scope.execProgress.value = action.description

    try {
      const result = await service().confirmAndExecute(action)
      if (result.success) {
        scope.pendingAction.value = null
        scope.pendingSuggestion.value = null
        await chain.settleDone(chainId)
      } else {
        chain.setStatusImmediately('failed')
        scope.errorReason.value = result.errorReason ?? '执行失败，请稍后重试'
      }
    } catch (err) {
      handleError(err, '执行失败，请稍后重试')
    } finally {
      scope.activeTool.value = null
      scope.execProgress.value = null
    }
  }

  /** 取消待确认动作（用户放弃执行），不进异常态。 */
  function cancelAction(): void {
    scope.pendingAction.value = null
    scope.pendingSuggestion.value = null
    if (scope.status.value === 'awaitingUser') chain.setStatusImmediately('idle')
  }

  return { proposeAction, confirmExecute, cancelAction }
}
