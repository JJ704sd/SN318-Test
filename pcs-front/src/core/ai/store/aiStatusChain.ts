import type { Ref } from 'vue'
import { env } from '@core/config/env'
import { DONE_HOLD, type AiStatus } from './aiStatus'

let configuredStatusMinDuration: number | null = null

/**
 * 注入 AI 状态展示配置。业务应从已加载的 config 入口传入，避免 Vite 多入口
 * 预构建时 config/ai 各持一份运行时缓存而使 AI 误读默认值。
 */
export function configureAiStatusTiming(options: {
  minDuration?: number | string
} = {}): void {
  const raw = options.minDuration
  if (raw === undefined || raw === null || raw === '') {
    configuredStatusMinDuration = null
    return
  }
  const value = Number(raw)
  configuredStatusMinDuration = Number.isFinite(value) ? Math.max(0, value) : 0
}

function getStatusMinDuration(): number {
  return configuredStatusMinDuration ?? env.aiStatusMinDuration
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface DisplayChainDeps {
  /** 展示态 ref：链内直接改写，store 不再单独维护切换。 */
  status: Ref<AiStatus>
  /**
   * done 态停留判定：返回 true 表示当前应停留 done（如有待采纳建议）而不回落 idle。
   * 由 store 按业务状态（chatSuggestion）注入。
   */
  holdDone: () => boolean
}

export interface DisplayChain {
  setStatusValue(nextStatus: AiStatus): void
  clearDoneTimer(): void
  beginStatusChain(initialStatus: AiStatus): number
  setStatusImmediately(nextStatus: AiStatus): void
  queueStatus(nextStatus: AiStatus, chainId: number): Promise<void>
  settleDone(chainId?: number): Promise<void>
}

/**
 * AI 状态展示链：排队切换展示态并保证每态最小展示时长。
 *
 * 配置为 0 时同步切换、完全跟随接口；配置正数时只补足当前状态尚未展示够的
 * 时间（接口本身已耗时的部分计入停留），避免状态闪烁或过早切换。同一时刻只允许
 * 一条活跃链，旧链排队中的状态会自动失效。
 */
export function createDisplayChain(deps: DisplayChainDeps): DisplayChain {
  const { status, holdDone } = deps

  let doneTimer: ReturnType<typeof setTimeout> | null = null
  let statusChainId = 0
  let statusEnteredAt = Date.now()
  let statusQueue: Promise<void> = Promise.resolve()

  function setStatusValue(nextStatus: AiStatus): void {
    status.value = nextStatus
    statusEnteredAt = Date.now()
  }

  function clearDoneTimer(): void {
    if (doneTimer) {
      clearTimeout(doneTimer)
      doneTimer = null
    }
  }

  /** 开始一条新的展示链；后续旧链排队中的状态会自动失效。 */
  function beginStatusChain(initialStatus: AiStatus): number {
    clearDoneTimer()
    statusChainId += 1
    statusQueue = Promise.resolve()
    setStatusValue(initialStatus)
    return statusChainId
  }

  /** 中断旧展示链并立即进入异常/交互状态。 */
  function setStatusImmediately(nextStatus: AiStatus): void {
    statusChainId += 1
    statusQueue = Promise.resolve()
    setStatusValue(nextStatus)
  }

  /** 排队进入下一状态；与当前链 id 不一致（旧链）则直接跳过。 */
  function queueStatus(nextStatus: AiStatus, chainId: number): Promise<void> {
    if (chainId !== statusChainId) return Promise.resolve()
    const minDuration = getStatusMinDuration()
    if (minDuration <= 0) {
      setStatusValue(nextStatus)
      return Promise.resolve()
    }
    const transition = statusQueue.then(async () => {
      if (chainId !== statusChainId) return
      const remaining = minDuration - (Date.now() - statusEnteredAt)
      if (remaining > 0) await delay(remaining)
      if (chainId === statusChainId) setStatusValue(nextStatus)
    })
    statusQueue = transition
    return transition
  }

  /** 成功完成：短暂停留 done 展示态后回落 idle（有待采纳建议则保持 done）。 */
  async function settleDone(chainId?: number): Promise<void> {
    if (chainId === undefined) setStatusValue('done')
    else await queueStatus('done', chainId)
    if (status.value !== 'done') return
    clearDoneTimer()
    doneTimer = setTimeout(() => {
      // 仅当仍停在 done 且无待采纳建议时才回落，避免覆盖用户新发起的状态
      if (status.value === 'done' && !holdDone()) setStatusValue('idle')
    }, getStatusMinDuration() || DONE_HOLD)
  }

  return {
    setStatusValue,
    clearDoneTimer,
    beginStatusChain,
    setStatusImmediately,
    queueStatus,
    settleDone,
  }
}
