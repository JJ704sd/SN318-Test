/**
 * MockAiAdapter 自然语言筛选解析（逻辑模块，S4-B 延迟加载）。
 *
 * 把用户自然语言筛选意图解析为结构化条件建议，供 requestSuggestions 的
 * 'list.nl-filter' 场景使用。不与 MockAiAdapter 同文件静态携带：
 * 仅在实际收到该场景请求时由适配器动态 import。
 */
import type { AiSuggestion, WaybillStatus } from '../types'
import type { BizType } from '@core/styles/tokens'

/**
 * 自然语言解析出的结构化筛选条件（mock 内部类型，不对外 export）。
 * 字段对齐 ListFilterBar 的 FilterQuery + 下单时间区间，便于父组件直接回填控件。
 * 真实适配器接入后由 LLM 输出 JSON 反序列化为同结构对象。
 */
interface NlFilterConditions {
  keyword?: string
  bizType?: BizType
  status?: WaybillStatus
  dateRange?: [string, string]
}

/** 业务类型中文 -> 枚举值映射（与 listConfig.ts BIZ_TYPE_OPTIONS 对齐） */
const BIZ_TYPE_CN_MAP: Record<string, BizType> = {
  快递: 'express',
  空运: 'air',
  FBA: 'fba',
  专线: 'line',
  海运: 'sea',
  上门取件: 'pickup',
  询价: 'inquiry',
}

/** 状态中文 -> 枚举值映射（与 listConfig.ts STATUS_OPTIONS 对齐） */
const STATUS_CN_MAP: Record<string, WaybillStatus> = {
  待揽收: 'pending',
  已揽收: 'picked_up',
  运输中: 'in_transit',
  在途: 'in_transit',
  已签收: 'delivered',
  已投递: 'delivered',
  异常: 'exception',
}

/** 格式化为 YYYY-MM-DD（避免本地时区漂移） */
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 业务类型识别：扫描文本中的业务类型关键词 */
function pickBizType(text: string): BizType | undefined {
  for (const [cn, value] of Object.entries(BIZ_TYPE_CN_MAP)) {
    if (text.includes(cn)) return value
  }
  return undefined
}

/** 状态识别：扫描文本中的状态关键词 */
function pickStatus(text: string): WaybillStatus | undefined {
  for (const [cn, value] of Object.entries(STATUS_CN_MAP)) {
    if (text.includes(cn)) return value
  }
  return undefined
}

/** 时间范围识别：支持「近 30 天 / 最近一个月 / 上周」 */
function pickDateRange(text: string): [string, string] | undefined {
  const today = new Date()
  if (/近\s*30\s*天|最近一个月/.test(text)) {
    const start = new Date(today)
    start.setDate(start.getDate() - 30)
    return [formatDate(start), formatDate(today)]
  }
  if (/上周/.test(text)) {
    const day = today.getDay() || 7 // 周日归为 7
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() - day - 7)
    const lastSaturday = new Date(lastSunday)
    lastSaturday.setDate(lastSunday.getDate() + 6)
    return [formatDate(lastSunday), formatDate(lastSaturday)]
  }
  return undefined
}

/**
 * 按自然语言文本解析为结构化筛选条件建议。
 *
 * 红线（规范 §02.2 原则三）：本函数【只产出建议】，不执行查询；建议携带的 action.payload
 * 是结构化条件，AiNlFilter 拿到后 emit 给父组件回填筛选控件，由用户确认/微调后点查询才执行。
 */
export function pickNlFilterSuggestion(text: string): AiSuggestion[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const conditions: NlFilterConditions = {}
  const summaryParts: string[] = []

  const bizType = pickBizType(trimmed)
  if (bizType) {
    conditions.bizType = bizType
    const cn = Object.entries(BIZ_TYPE_CN_MAP).find(([, v]) => v === bizType)?.[0]
    if (cn) summaryParts.push(cn)
  }

  const status = pickStatus(trimmed)
  if (status) {
    conditions.status = status
    const cn = Object.entries(STATUS_CN_MAP).find(([, v]) => v === status)?.[0]
    if (cn) summaryParts.push(cn)
  }

  const dateRange = pickDateRange(trimmed)
  if (dateRange) {
    conditions.dateRange = dateRange
    if (/近\s*30\s*天|最近一个月/.test(trimmed)) {
      summaryParts.push('近 30 天')
    } else if (/上周/.test(trimmed)) {
      summaryParts.push('上周')
    }
  }

  // 兜底：未识别出任何结构化字段时，把整句作为关键词
  if (summaryParts.length === 0) {
    conditions.keyword = trimmed
    summaryParts.push(`关键词「${trimmed}」`)
  }

  const description = `已理解筛选意图：${summaryParts.join(' · ')}`

  // evidence 只包含识别出的字段（"不限"的字段不进 evidence），
  // AiNlFilter 据此渲染条件 Tag；父组件据 action.payload 回填筛选控件。
  const evidence: AiSuggestion['evidence'] = []
  if (conditions.bizType) {
    const cn = Object.entries(BIZ_TYPE_CN_MAP).find(([, v]) => v === conditions.bizType)?.[0]
    evidence.push({ label: '业务类型', value: cn ?? conditions.bizType, source: 'AI 解析' })
  }
  if (conditions.status) {
    const cn = Object.entries(STATUS_CN_MAP).find(([, v]) => v === conditions.status)?.[0]
    evidence.push({ label: '状态', value: cn ?? conditions.status, source: 'AI 解析' })
  }
  if (conditions.dateRange) {
    evidence.push({ label: '时间范围', value: conditions.dateRange.join(' ~ '), source: 'AI 解析' })
  }
  if (conditions.keyword) {
    evidence.push({ label: '关键词', value: conditions.keyword, source: 'AI 解析' })
  }

  return [
    {
      id: 'sg-nl-filter',
      title: 'AI 解析结果',
      description,
      riskLevel: 'low',
      evidence,
      action: {
        // action.payload 承载结构化条件；requireConfirm=false 表示不需要二次确认
        // （用户在筛选控件上微调后点查询即为"确认"，不走 confirmAndExecute）
        type: 'apply-filter',
        payload: conditions,
        requireConfirm: false,
        description: '应用 AI 解析的筛选条件（可在控件上微调后点查询）',
      },
    },
  ]
}
