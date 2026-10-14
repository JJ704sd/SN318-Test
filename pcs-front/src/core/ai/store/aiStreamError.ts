import { AiAbortError } from '@core/ai/service/AiAbortError'
import { isStreamError } from '@core/api/streamError'
import type { AiStatus, AiTimeoutKind } from './aiStatus'

/** 流式/网络异常归一化后的展示决策，供 store 直接落展示态。 */
export type StreamErrorFlow =
  | { outcome: 'aborted' }
  | { outcome: 'failed'; reason: string }
  | { outcome: 'timeout'; kind: AiTimeoutKind; reason: string }

export const TIMEOUT_STATUS: Record<
  AiTimeoutKind,
  'timeoutNetwork' | 'timeoutServer' | 'timeoutModel'
> = {
  network: 'timeoutNetwork',
  server: 'timeoutServer',
  model: 'timeoutModel',
}

/**
 * 把适配器/网络层异常归一为展示流决策：
 *   - 用户中断（AiAbortError / aborted 流错误）→ aborted（中性态，非失败）；
 *   - 网络 / 服务 / 模型超时 → timeout（kind 细分，服务端超时沿用活跃态语义）；
 *   - 其余 → failed，仅给出原因文案。
 * 未知异常统一走 fallback，不向用户暴露堆栈 / 错误码。
 */
export function dispatchStreamError(
  error: unknown,
  fallback: string,
): StreamErrorFlow {
  if (error instanceof AiAbortError || (isStreamError(error) && error.kind === 'aborted')) {
    return { outcome: 'aborted' }
  }
  if (isStreamError(error)) {
    if (error.kind === 'network' || error.kind === 'server' || error.kind === 'model') {
      return { outcome: 'timeout', kind: error.kind, reason: error.reason }
    }
    return { outcome: 'failed', reason: error.reason }
  }
  return { outcome: 'failed', reason: fallback }
}

export type { AiStatus }
