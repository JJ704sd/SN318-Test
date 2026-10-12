/**
 * Demo API 定义 + 类型（实施方案任务 5.1；规范 二·目录结构 / 九·数据格式规范）
 *
 * 基于 @/api/request 的 http 实例（拦截器/鉴权/刷新/重试已在 5.1A 内置），
 * 本文件只负责 5 类模板的 API 函数签名 + 类型 + mock 假数据映射；不重复封装 axios。
 * mock 与真实接口共用同一套 TS 类型；真实后端切换点见各函数内注释。
 */

import type { BizType } from '@baiyun/template-core/tokens'
import * as mock from '@/mock'

/** 运单状态（物流域状态，非 UI 语义色；展示时由视图映射到 ByStatusTag 的 StatusType）。 */
export type WaybillStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'exception'

/** 列表页单条运单记录。 */
export interface WaybillListItem {
  id: string
  waybillNo: string
  bizType: BizType
  status: WaybillStatus
  destination: string
  consignee: string
  /** 重量（KG），规范 §09 保留 3 位小数展示。 */
  weight: number
  /** 金额（CNY），规范 §09 保留 4 位小数展示。 */
  amount: number
  /** ISO 时间字符串，展示时由 formatDateTime 转换。 */
  createdAt: string
}

/** 列表分页查询参数。 */
export interface PageQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: WaybillStatus
  bizType?: BizType
}

/** 通用分页结果结构。 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 运单流转轨迹节点（详情页时间线用）。 */
export interface WaybillTraceNode {
  time: string
  title: string
  desc?: string
}

/** 详情页：运单完整信息。 */
export interface WaybillDetail extends WaybillListItem {
  sender: string
  senderPhone: string
  consigneePhone: string
  /** 体积（CBM），规范 §09 保留 4 位小数展示。 */
  volume: number
  remark?: string
  traces: WaybillTraceNode[]
}

/** 详情抽屉预警提示（异常/超时/待处理时出现，无则不渲染此条）。 */
export interface WaybillDrawerWarning {
  /** 语义色：warning=橙色（超时/待处理）/ error=红色（异常）*/
  type: 'warning' | 'error'
  /** 预警文案 */
  message: string
  /** 可选「去处理」按钮文案；不传则仅展示提示文字 */
  actionLabel?: string
}

/** 详情抽屉：精简版详情（无轨迹，用于列表行内快速查看）。 */
export interface WaybillDrawerDetail extends WaybillListItem {
  sender: string
  remark?: string
  /** 预警提示：异常/超时/待处理时出现，无预警则 null/undefined，抽屉不渲染预警条 */
  warning?: WaybillDrawerWarning | null
}

/** 表单页：随表单一起提交的附件项（显式提交，非自动上传）。 */
export interface WaybillAttachment {
  name: string
  url?: string
}

/** 表单页：新建/编辑运单提交的数据结构。 */
export interface WaybillFormData {
  waybillNo?: string
  bizType: BizType
  destination: string
  consignee: string
  consigneePhone: string
  /** 发货日期（YYYY-MM-DD）。 */
  shipDate: string
  weight: number
  amount: number
  /** 是否保价。 */
  insured: boolean
  remark?: string
  attachments?: WaybillAttachment[]
}

/** 仪表盘单个 KPI 指标（数值 + 同比，同比正负决定升降趋势）。 */
export interface DashboardKpi {
  /** 指标值。 */
  value: number
  /** 同比增幅（百分数本身，如 12.5 表示 +12.50%；负数为下降）。 */
  yoy: number
}

/** 仪表盘业务类型分布（饼图，按业务线单量占比）。 */
export interface DashboardDistItem {
  bizType: BizType
  count: number
}

/** 仪表盘明细表行（图表背后的各业务线当日数据，供下钻）。 */
export interface DashboardDetailRow {
  id: string
  bizType: BizType
  /** 当日单量。 */
  count: number
  /** 当日金额（CNY）。 */
  amount: number
  /** 同比增幅（百分数本身）。 */
  yoy: number
}

/** 仪表盘统计数据（指标卡 + 趋势/占用/金额图表 + 明细）。 */
export interface DashboardStats {
  totalWaybills: number
  inTransitCount: number
  exceptionCount: number
  todayAmount: number
  /** 四个 KPI 的同比（与上面数值配对，供指标卡展示升降）。 */
  kpi: {
    totalWaybills: DashboardKpi
    inTransitCount: DashboardKpi
    exceptionCount: DashboardKpi
    todayAmount: DashboardKpi
  }
  /** 近 7 日运单单量趋势（主折线图）。 */
  trend: Array<{ date: string; count: number }>
  /** 近 7 日金额趋势（次级柱状图）。 */
  amountTrend: Array<{ date: string; amount: number }>
  /** 业务类型分布（辅饼图）。 */
  distribution: DashboardDistItem[]
  /** 明细数据（明细表格，各业务线当日单量/金额/同比）。 */
  detailList: DashboardDetailRow[]
}

/**
 * 列表页：分页查询运单列表。
 * 真实后端切换点：改为 `get<PageResult<WaybillListItem>>('/api/waybills', query)`。
 */
export function getList(query: PageQuery): Promise<PageResult<WaybillListItem>> {
  return mock.getList(query)
}

/**
 * 详情页：按 id 查完整运单信息。
 * 真实后端切换点：改为 `get<WaybillDetail>(`/api/waybills/${id}`)`。
 */
export function getDetail(id: string): Promise<WaybillDetail> {
  return mock.getDetail(id)
}

/**
 * 详情抽屉：列表行内快速查看的精简详情。
 * 真实后端切换点：改为 `get<WaybillDrawerDetail>(`/api/waybills/${id}/drawer`)`。
 */
export function getDrawerDetail(id: string): Promise<WaybillDrawerDetail> {
  return mock.getDrawerDetail(id)
}

/**
 * 表单页：提交新建/编辑运单。
 * 真实后端切换点：改为 `post<{ id: string; waybillNo: string }>('/api/waybills', data)`。
 */
export function submitForm(data: WaybillFormData): Promise<{ id: string; waybillNo: string }> {
  return mock.submitForm(data)
}

/**
 * 仪表盘：统计卡片 + 趋势数据。
 * 真实后端切换点：改为 `get<DashboardStats>('/api/waybills/dashboard-stats')`。
 */
export function getDashboardStats(): Promise<DashboardStats> {
  return mock.getDashboardStats()
}
