/**
 * MockAiAdapter 对话回复库（数据模块，S4-B 延迟加载）。
 *
 * 纯本地假数据，供 sendMessage 按用户输入关键词匹配回复，未命中用缺省回复。
 * 不与 MockAiAdapter 同文件静态携带：仅在实际调用 sendMessage 时由适配器动态 import。
 */
import type { AiSuggestion } from '../types'

/** 一条预设对话回复 */
interface MockReply {
  /** 命中该回复的关键词；空数组表示缺省回复 */
  keywords: string[]
  /** 回复文本（流式逐字输出） */
  text: string
  /**
   * 回复附带的建议（如有），其 action 仍须经用户确认。
   * 携带【完整建议】（title/evidence）而非裸 action，使对话式动作条也能展示
   * 标题与「AI 依据」（可解释性，规范 §02.2 AI 非黑盒）。
   */
  suggestion?: AiSuggestion
}

/**
 * 预设对话回复。sendMessage 按用户输入关键词匹配，未命中用缺省回复。
 * 其中一条带 action，用于演示对话内「建议 → 确认 → 执行」链路（任务 4.10）。
 */
const MOCK_REPLIES: MockReply[] = [
  {
    // 详情页只读摘要（任务 5.5）：置于首位，优先于「状态」批量回复命中
    keywords: ['摘要', '风险提示'],
    text: '该运单基础信息完整，物流轨迹更新正常，暂无明显异常。目的地与申报信息匹配，建议按当前渠道时效正常跟进；如后续 48 小时内轨迹无更新，需关注是否延误。',
  },
  {
    keywords: ['你好', '您好', 'hi', 'hello'],
    text: '你好，我是运小星。可以帮你查询运单、分析单量趋势、批量处理异常件。试着问我「帮我看看延误的运单」。',
  },
  {
    keywords: ['批量', '发货', '状态'],
    text: '我检测到有 128 条运单已完成揽收但状态未更新。我可以帮你批量置为「已发货」，执行前需要你确认。',
    // 携带完整建议：动作条据此展示标题与「AI 依据」，不再因裸 action 而缺失可解释信息
    suggestion: {
      id: 'reply-batch-status',
      title: '批量更新为「已发货」',
      description: '检测到 128 条运单已完成揽收但状态未更新，建议批量置为「已发货」。',
      riskLevel: 'high',
      evidence: [
        { label: '待更新运单', value: '128 条', source: '运单列表筛选' },
        { label: '揽收完成占比', value: '100%', source: '揽收记录' },
        { label: '预计影响', value: '128 条状态变更', source: '批量预演' },
      ],
      action: {
        type: 'batch-update-status',
        payload: { status: 'shipped', count: 128 },
        requireConfirm: true,
        description: '批量将 128 条运单状态修改为「已发货」',
      },
    },
  },
  {
    keywords: ['延误', '异常', '超时'],
    text: '当前有 3 条运单延误超过承诺时效，其中 1 条已 2 天无轨迹更新。建议优先联系承运商并向客户预警。',
  },
  {
    // 缺省回复
    keywords: [],
    text: '我已收到你的问题。这是模板内置的模拟回复，接入真实模型后即可返回实际结果。',
  },
]

/**
 * 按用户输入选取一条预设回复：命中任一关键词即返回，否则返回缺省回复。
 */
export function pickReply(userInput: string): MockReply {
  const matched = MOCK_REPLIES.find(
    (reply) => reply.keywords.length > 0 && reply.keywords.some((kw) => userInput.includes(kw)),
  )
  // MOCK_REPLIES 末条恒为缺省回复，故 fallback 一定存在
  return matched ?? MOCK_REPLIES[MOCK_REPLIES.length - 1]!
}
