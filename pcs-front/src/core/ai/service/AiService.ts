/**
 * AiService 抽象契约（实施方案任务 4.1 / 规范 §02.2 AI 原生原则）
 *
 * 这是整个 AI 层可替换性的基石：Mock 适配器（任务 4.2）与真实 LLM 适配器
 * （任务 4.3）都实现同一接口，UI 层只依赖本抽象、不感知具体实现（任务 4.4）。
 *
 * 三步链红线（规范 §02.2 原则三）在接口层面强制体现：
 *   1. requestSuggestions —— 只【产出建议】，无任何副作用；
 *   2. （用户在 UI 上显式确认）—— 不在本接口内，属交互层；
 *   3. confirmAndExecute —— 只有传入用户已确认的 action 时才【执行】。
 * requestSuggestions 与 confirmAndExecute 严格分离，本接口【不提供】
 * 任何「产出建议并同时执行」的合并方法。
 */

import type {
  AiAction,
  AiActionResult,
  AiSendMessageOptions,
  AiSendMessageResult,
  AiSuggestion,
  AiSuggestionRequest,
} from './types'

/**
 * AI 服务统一接口。所有适配器实现此接口。
 */
export interface AiService {
  /**
   * 发送对话消息，支持流式返回。
   * 通过 options.onChunk 增量回调逐字返回，Promise resolve 为完整结果。
   * 返回结果可携带 action，但【仅为建议】，须经用户确认后走 confirmAndExecute。
   */
  sendMessage(options: AiSendMessageOptions): Promise<AiSendMessageResult>

  /**
   * 按场景 + 上下文请求结构化建议列表。
   * 【只读】：不产生任何副作用、不执行任何动作，即使建议携带 action 也不执行。
   */
  requestSuggestions(request: AiSuggestionRequest): Promise<AiSuggestion[]>

  /**
   * 执行一个【用户已确认】的动作。
   * 这是三步链中唯一会产生副作用的方法，调用方必须保证 action 已经过用户显式确认
   * （高风险动作还需二次确认）。
   */
  confirmAndExecute<TData = unknown>(action: AiAction): Promise<AiActionResult<TData>>
}

/**
 * AI 服务抽象基类：供适配器继承，集中放置与具体后端无关的通用逻辑。
 * 三个核心能力均声明为 abstract，强制子类实现，且保持三段分离。
 */
export abstract class BaseAiService implements AiService {
  abstract sendMessage(options: AiSendMessageOptions): Promise<AiSendMessageResult>

  abstract requestSuggestions(request: AiSuggestionRequest): Promise<AiSuggestion[]>

  abstract confirmAndExecute<TData = unknown>(
    action: AiAction,
  ): Promise<AiActionResult<TData>>
}
