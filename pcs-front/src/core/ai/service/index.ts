/**
 * AI 服务统一出口。
 *
 * 正式契约（自 S4-C 起，显式注册为唯一可用路径）：
 *   - registerAiService(adapter)：业务系统在启用 AI 后显式注册适配器
 *     （真实业务注册自定义 adapter；模板演示注册 MockAiAdapter）。
 *   - getAiService()：取当前实例；未注册时抛出明确的初始化错误（不再回落 Mock）。
 *
 * 行为收紧说明（S4-C）：早期 getAiService() 未注册时回落默认 MockAiAdapter，
 * 使 import service / ai store 即静态携带 Mock 及 Mock 数据，违背「Mock 仅在显式注册时加载」。
 * 自本版起移除该回落：AI 必须经 registerAiService 显式注册后才可用。
 * deprecated aiProvider('mock'|'llm') 不再驱动任何适配器实例化，2.0 物理移除。
 */

import type { AiService } from './AiService'

let instance: AiService | null = null

/** 业务系统注册 AI 服务实例；可重复注册覆盖（支持开发热更新时安全更换适配器）。 */
export function registerAiService(adapter: AiService): void {
  instance = adapter
}

/** 获取当前 AiService：须先 registerAiService 注册；未注册抛明确初始化错误。 */
export function getAiService(): AiService {
  if (!instance) {
    throw new Error(
      '[ai] 尚未注册 AI 服务：请先调用 registerAiService() 注册真实或 Mock 适配器（启用 AI 后、使用前）。',
    )
  }
  return instance
}

export type { AiService } from './AiService'
export type * from './types'
