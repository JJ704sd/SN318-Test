import type { Ref } from 'vue'
import type { AiStatus, AiTimeoutKind } from './aiStatus'
import type { DisplayChain } from './aiStatusChain'
import { dispatchStreamError, TIMEOUT_STATUS } from './aiStreamError'

/** 展示态切换所读写的 store 字段与依赖。 */
export interface StatusControlCtx {
  scope: {
    status: Ref<AiStatus>
    errorReason: Ref<string | null>
  }
  chain: DisplayChain
  /** 中断当前进行中请求（store 的 controller.abort）。 */
  abortRequest: () => void
}

/** 汇聚「展示态切换」相关 Action：异常归一、用户中断、超时、继续等待。 */
export function createStatusControl(ctx: StatusControlCtx) {
  const { scope, chain, abortRequest } = ctx

  /** 只接收适配器已归一的友好错误；未知异常不把技术信息直接暴露给用户。 */
  function applyServiceError(error: unknown, fallback: string): void {
    const flow = dispatchStreamError(error, fallback)
    if (flow.outcome === 'aborted') {
      chain.setStatusImmediately('aborted')
    } else if (flow.outcome === 'timeout') {
      scope.errorReason.value = flow.reason
      handleTimeout(flow.kind)
    } else {
      chain.setStatusImmediately('failed')
      scope.errorReason.value = flow.reason
    }
  }

  /**
   * 用户主动停止：中断进行中的请求，置 aborted（中性态）。
   * 中断 ≠ 失败，禁止落 failed。
   */
  function abort(): void {
    abortRequest()
    chain.clearDoneTimer()
    chain.setStatusImmediately('aborted')
  }

  /** 按归因处理超时：network/server/model 分别落对应状态。 */
  function handleTimeout(kind: AiTimeoutKind): void {
    chain.clearDoneTimer()
    chain.setStatusImmediately(TIMEOUT_STATUS[kind])
  }

  /**
   * 服务端超时并不代表任务失败：用户选择继续等待后恢复「思考中」展示，
   * 不重复发起请求，也不把它误导成可重试错误。
   */
  function continueWaiting(): void {
    if (scope.status.value === 'timeoutServer') chain.setStatusImmediately('thinking')
  }

  return { applyServiceError, abort, handleTimeout, continueWaiting }
}
