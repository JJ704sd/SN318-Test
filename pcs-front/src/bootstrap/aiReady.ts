/**
 * AI 服务唯一初始化入口（H-01：统一 ensureAiReady，消除「prod 声明 LLM 却注册 Mock」的配置/行为矛盾）。
 *
 * 设计：
 * - 模块级缓存唯一 Promise，所有 AI 交互（assistant/embedded 懒加载、首次建议请求）await 同一个实例，
 *   杜绝「组件先用服务、注册 Promise 后完成」的初始化竞态。
 * - 适配器选择与配置显式一致：
 *   - 总开关关闭或配置未加载 → disabled(aiOff)，不加载任何 AI
 *   - aiProvider === 'mock' → 动态导入并注册 MockAiAdapter（仅 demo/mock 配置）
 *   - 其余（如 prod 的 llm，模板未提供真实业务 adapter）→ disabled(noAdapter)，
 *     生产环境绝不静默实例化 MockAiAdapter（fail-safe）。
 * - getConfig() 未加载时视为未启用：异常路径不注册任何 AI。
 */
import { env, getConfig } from '@baiyun/template-core/config'

export type AiReadyStatus = 'pending' | 'ready' | 'disabled' | 'error'

export interface AiReadyResult {
  status: AiReadyStatus
  reason?: 'aiOff' | 'noAdapter'
  message?: string
}

let promise: Promise<AiReadyResult> | null = null

/** 获取唯一 AI 初始化 Promise；首次调用触发动态导入与注册，结果缓存复用。 */
export function ensureAiReady(): Promise<AiReadyResult> {
  if (!promise) {
    promise = (async (): Promise<AiReadyResult> => {
      if (!env.aiEnabled || !getConfig()) {
        return { status: 'disabled', reason: 'aiOff' }
      }
      if (env.aiProvider === 'mock') {
        const { configureAiStatusTiming, registerAiService, MockAiAdapter } = await import(
          '@baiyun/template-core/ai'
        )
        configureAiStatusTiming({
          minDuration: getConfig()?.aiStatusMinDuration,
        })
        registerAiService(new MockAiAdapter())
        return { status: 'ready' }
      }
      // llm 等：模板未提供真实业务 adapter，禁用 AI（不注册 Mock）；业务在真实环境自行注册自定义 adapter。
      return { status: 'disabled', reason: 'noAdapter' }
    })()
  }
  return promise
}

/** 测试辅助：清空缓存的初始化 Promise，便于逐用例验证注册/禁用分支。 */
export function resetAiReadyForTest(): void {
  promise = null
}
