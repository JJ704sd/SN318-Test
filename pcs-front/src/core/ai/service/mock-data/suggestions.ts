/**
 * MockAiAdapter 预设建议数据（数据模块，S4-B 延迟加载）。
 *
 * 纯本地假数据，供 requestSuggestions 按场景 key 取建议列表。
 * 场景覆盖阶段 5 页面模板将用到的 AI 场景：表单页 / 列表页 / 详情页 / 仪表盘。
 * 不与 MockAiAdapter 同文件静态携带：仅在实际调用 requestSuggestions（非 NL 场景）时动态 import。
 */
import type { AiSuggestion } from '../types'

/**
 * 按场景 key 组织的预设建议列表。
 * key 与后续页面模板约定一致，如 'form.waybill' / 'list.batch-operation'。
 * requestSuggestions 据 scene 取对应列表；未命中场景返回空数组。
 */
export const MOCK_SUGGESTIONS: Record<string, AiSuggestion[]> = {
  // 表单页：填写运单表单时的 AI 建议（任务 5.7）
  // 每条建议携带 action.payload = { field, value }，用户点「采纳」后由 FormFields 写入对应字段。
  // 红线（规范 §02.2 原则三）：建议【绝不自动填入】，须用户点采纳才 emit apply -> 父组件写入。
  'form.waybill': [
    {
      id: 'sg-waybill-destination',
      title: '推荐目的地',
      description: '根据当前业务类型，建议填写热门目的地「美国 · 洛杉矶」。',
      riskLevel: 'low',
      evidence: [
        { label: '业务类型', value: '快递', source: '当前表单' },
        { label: '近 30 天热门目的地', value: '美国 · 洛杉矶', source: '运单历史' },
      ],
      action: {
        type: 'fill-form-field',
        payload: { field: 'destination', value: '美国 · 洛杉矶' },
        requireConfirm: false,
        description: '将目的地填写为「美国 · 洛杉矶」',
      },
    },
    {
      id: 'sg-waybill-consignee',
      title: '建议收件人',
      description: '依据历史相似运单，建议收件人「张明」。',
      riskLevel: 'low',
      evidence: [
        { label: '历史相似运单', value: '12 单', source: '收件人记录' },
        { label: '常用收件人', value: '张明', source: '收件人记录' },
      ],
      action: {
        type: 'fill-form-field',
        payload: { field: 'consignee', value: '张明' },
        requireConfirm: false,
        description: '将收件人填写为「张明」',
      },
    },
    {
      id: 'sg-waybill-declare',
      title: '预填申报信息',
      description: '依据历史相似货品，建议申报品名「电子配件」，申报价值 45 USD。',
      riskLevel: 'low',
      evidence: [
        { label: '历史相似货品', value: '电子配件（12 单）', source: '申报记录' },
        { label: '平均申报价值', value: '45 USD', source: '申报记录' },
      ],
      action: {
        type: 'fill-form-field',
        payload: { field: 'remark', value: '申报品名：电子配件；申报价值：45 USD' },
        requireConfirm: false,
        description: '将备注填写为申报信息',
      },
    },
  ],

  // 列表页：批量操作时的 AI 建议（可执行动作，高风险走二次确认）
  'list.batch-operation': [
    {
      id: 'sg-batch-status',
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
  ],

  // 详情页：异常运单的风险提示与处理建议
  'detail.exception': [
    {
      id: 'sg-detail-delay',
      title: '优先处理延误运单',
      description: '该运单已延误 3 天，超过承诺时效，建议联系承运商并向客户预警。',
      riskLevel: 'medium',
      evidence: [
        { label: '当前时效', value: '已延误 3 天', source: '轨迹跟踪' },
        { label: '承诺时效', value: '5 天', source: '渠道 SLA' },
        { label: '最近轨迹', value: '2 天无更新', source: '轨迹跟踪' },
      ],
    },
  ],

  // 仪表盘：数据洞察类建议（纯解释，无可执行动作）
  'dashboard.insight': [
    {
      id: 'sg-dashboard-peak',
      title: '发货高峰预测',
      description: '近 7 天单量环比上升 18%，预计下周三达到高峰，建议提前排班。',
      riskLevel: 'low',
      evidence: [
        { label: '近 7 天单量', value: '环比 +18%', source: '单量趋势' },
        { label: '预测高峰日', value: '下周三', source: '趋势外推' },
      ],
    },
  ],

  // 列表页：筛选后无结果的 AI 原因建议（任务 5.3A 空态）
  // 只读型建议，无可执行 action；用户可点「一键放宽」清空筛选条件后重查
  'list.empty-suggestion': [
    {
      id: 'sg-empty-suggestion',
      title: 'AI 原因分析',
      description: '可能因筛选条件过严导致无结果。建议放宽时间范围、清除状态或业务类型筛选后重试。',
      riskLevel: 'low',
      evidence: [
        { label: '可能原因', value: '筛选条件组合过严', source: 'AI 分析' },
        { label: '建议一', value: '清除状态/业务类型筛选', source: 'AI 推荐' },
        { label: '建议二', value: '放宽时间范围至近 30 天', source: 'AI 推荐' },
      ],
    },
  ],
}
