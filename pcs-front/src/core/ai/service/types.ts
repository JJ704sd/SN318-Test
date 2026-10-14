/**
 * AI 服务层类型契约（实施方案任务 4.1 / 规范 §02.2 AI 原生原则、§10 嵌入式 AI、§11 对话式 AI）
 *
 * 本文件只定义类型，不含任何实现。所有适配器（Mock / 真实 LLM）共同实现 AiService 接口。
 *
 * 核心红线（规范 §02.2 原则三）：AI 交互遵循「建议 → 确认 → 执行」三步链。
 * AI 只能【产出建议】(requestSuggestions) 与在【用户确认后执行】(confirmAndExecute)，
 * 二者在类型层面就必须分离，禁止出现「一步直接执行建议」的方法。
 */

/** 消息角色 */
export type AiMessageRole = 'user' | 'assistant' | 'system'

/** 一条对话消息 */
export interface AiMessage {
  /** 消息唯一 id */
  id: string
  role: AiMessageRole
  /** 文本内容；流式输出时会随 chunk 增量拼接 */
  content: string
  /** 是否仍在流式输出中（true=尚未收完，末尾可渲染光标） */
  streaming?: boolean
  /** 创建时间戳（ms） */
  createdAt: number
}

/**
 * AI 建议的数据依据（规范：AI 建议必须可解释、非黑盒）。
 * 用于向用户解释「这条建议基于什么」，由 AiActionBar 的「查看依据」区展示。
 */
export interface AiEvidence {
  /** 依据项名称，如「近 30 天运单量」 */
  label: string
  /** 依据项取值，如「128 条」 */
  value: string
  /** 依据来源，如「运单统计表」，可选 */
  source?: string
}

/** 动作风险等级（用于 UI 是否走二次确认，规范 §5.10） */
export type AiRiskLevel = 'low' | 'medium' | 'high'

/**
 * 一条 AI 建议。建议本身【不产生副作用】，只有关联的 action 在
 * 用户显式确认后经 confirmAndExecute 才会执行。
 */
export interface AiSuggestion {
  /** 建议唯一 id */
  id: string
  /** 建议标题 */
  title: string
  /** 建议详细说明 */
  description: string
  /**
   * 关联的可执行动作。可为空——纯解释/提示类建议没有可执行动作。
   * 存在时也【不代表已执行】，须经用户确认后走 confirmAndExecute。
   */
  action?: AiAction
  /** 风险等级：high 时 UI 必须走二次确认 */
  riskLevel: AiRiskLevel
  /**
   * 数据依据（可解释性载体，规范要求 AI 非黑盒）。
   * 类型层就存在，避免后续 UI 无处展示「AI 为什么这么建议」。
   */
  evidence: AiEvidence[]
}

/**
 * 一个可执行动作。type 标识动作种类，payload 承载执行参数。
 * requireConfirm=true 时（通常对应高风险），UI 须在执行前二次确认。
 */
export interface AiAction<TPayload = unknown> {
  /** 动作类型标识，如 'batch-update-status' / 'save-form' */
  type: string
  /** 动作执行所需的结构化参数 */
  payload: TPayload
  /** 是否需要用户二次确认后才执行（高风险动作为 true） */
  requireConfirm: boolean
  /** 面向用户的动作描述，如「批量修改 128 条运单状态为已发货」 */
  description: string
}

/** confirmAndExecute 的执行结果 */
export interface AiActionResult<TData = unknown> {
  /** 是否执行成功 */
  success: boolean
  /** 成功时的返回数据 */
  data?: TData
  /**
   * 失败原因文案（面向用户，规范 §02.2 原则四：不暴露堆栈/错误码）。
   * success=false 时提供。
   */
  errorReason?: string
}

/** sendMessage 的流式增量回调载荷 */
export interface AiStreamChunk {
  /** 本次新增的文本片段 */
  delta: string
  /** 是否为最后一个 chunk（true=本轮输出结束） */
  done: boolean
}

/** sendMessage 的流式回调 */
export type AiStreamHandler = (chunk: AiStreamChunk) => void

/**
 * 运单状态（从业务模板 @/api/demo 迁入，供 AI 建议 mock 数据使用）。
 * 业务项目可自行定义结构一致的类型，跨层赋值在 TS 结构化类型下兼容。
 */
export type WaybillStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'exception'

/** sendMessage 入参 */
export interface AiSendMessageOptions {
  /** 用户输入内容 */
  content: string
  /** 已有对话上下文（多轮对话时传入历史消息） */
  history?: AiMessage[]
  /**
   * 进入 AI 处理阶段的回调（连接建立/排队结束、即将开始产出）。
   * 由适配器在「请求中」结束、「思考中」开始的真实时机触发，供上层把
   * status 从 requesting 切到 thinking——否则 requesting 态会被瞬间跳过、无法呈现。
   */
  onStart?: () => void
  /** 流式增量回调；不传则等待完整返回 */
  onChunk?: AiStreamHandler
  /** 中断信号：用户点「停止」时 abort（规范 §02.2 原则四：中断 ≠ 失败） */
  signal?: AbortSignal
}

/** sendMessage 完整返回（流式结束后的最终消息） */
export interface AiSendMessageResult {
  /** AI 的完整回复消息 */
  message: AiMessage
  /**
   * 本轮回复附带的建议（如有），仍须走确认流程。
   * 携带 action 时即为可执行建议，其 title/evidence 供 AiActionBar 展示
   * （可解释性载体，规范：AI 非黑盒）——故此处传【完整建议】而非裸 action。
   */
  suggestion?: AiSuggestion
}

/** requestSuggestions 入参 */
export interface AiSuggestionRequest {
  /** 场景 key，如 'form.waybill' / 'list.batch-operation'，用于取对应预设建议 */
  scene: string
  /**
   * 场景上下文，如当前表单已填字段、选中的列表行等。
   * 供适配器据此产出更贴合的建议。
   */
  context?: Record<string, unknown>
  /**
   * 进入 AI 处理阶段的回调（同 AiSendMessageOptions.onStart）：
   * 由适配器在「请求中」结束、开始分析时触发，供上层把 status 从 requesting 切到 thinking。
   */
  onStart?: () => void
  /** 中断信号 */
  signal?: AbortSignal
}

/**
 * 自然语言筛选场景的解析结果：业务 UI 根据此数据回填筛选控件。
 * 原汁原味的筛选条件模型，与业务层的筛选 Query 保持对齐。
 */
export interface NlFilterConditions {
  keyword?: string
  bizType?: string // 业务类型：express/air/fba/line/sea/pickup/inquiry
  status?: WaybillStatus
  dateRange?: [string, string]
}
