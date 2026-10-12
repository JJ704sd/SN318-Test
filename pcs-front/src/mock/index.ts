/**
 * 页面模板层假数据（实施方案任务 5.1；规范 §09 数据展示）
 *
 * 与 @/api/demo.ts 共用同一套 TS 类型；只负责生成假数据 + 模拟网络延迟，
 * 不碰 axios/http（请求底座见 @baiyun/template-core 的 http）。真实后端接入后本文件即可整体移除。
 */

import type {
  DashboardDetailRow,
  DashboardStats,
  PageQuery,
  PageResult,
  WaybillDetail,
  WaybillDrawerDetail,
  WaybillDrawerWarning,
  WaybillFormData,
  WaybillListItem,
} from '@/api/demo'

/** 模拟网络延迟（ms）。 */
const MOCK_DELAY = 300

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 业务类型池，对应 ByBizTag 的 BizType。 */
const BIZ_TYPES: WaybillListItem['bizType'][] = [
  'express',
  'air',
  'fba',
  'line',
  'sea',
  'pickup',
  'inquiry',
]

/** 运单状态池：待揽收/已揽收/运输中/已签收/异常。 */
const STATUSES: WaybillListItem['status'][] = [
  'pending',
  'picked_up',
  'in_transit',
  'delivered',
  'exception',
]

/** 目的地池（跨境物流常见目的国/地区）。 */
const DESTINATIONS = ['美国·洛杉矶', '德国·汉堡', '日本·大阪', '英国·伦敦', '澳大利亚·悉尼']

/** 生成一条固定种子的运单记录（seed 决定编号/字段，保证同 id 多次读取一致）。 */
function buildWaybill(seed: number): WaybillListItem {
  return {
    id: `wb-${seed}`,
    waybillNo: `BY${String(10000000 + seed)}`,
    bizType: BIZ_TYPES[seed % BIZ_TYPES.length] as WaybillListItem['bizType'],
    status: STATUSES[seed % STATUSES.length] as WaybillListItem['status'],
    destination: DESTINATIONS[seed % DESTINATIONS.length] as string,
    consignee: `客户${String(seed).padStart(3, '0')}`,
    weight: Number((1.2 + (seed % 20) * 0.7).toFixed(3)),
    amount: Number((88 + (seed % 50) * 23.5).toFixed(4)),
    createdAt: new Date(Date.now() - seed * 3_600_000).toISOString(),
  }
}

const WAYBILL_POOL: WaybillListItem[] = Array.from({ length: 86 }, (_, i) => buildWaybill(i + 1))

/** 分页 + 关键词/状态/业务类型过滤，模拟真实列表接口行为。 */
export function getList(query: PageQuery): Promise<PageResult<WaybillListItem>> {
  const filtered = WAYBILL_POOL.filter((item) => {
    if (query.status && item.status !== query.status) return false
    if (query.bizType && item.bizType !== query.bizType) return false
    if (query.keyword) {
      const kw = query.keyword.trim()
      if (kw && !item.waybillNo.includes(kw) && !item.consignee.includes(kw)) return false
    }
    return true
  })
  const start = (query.page - 1) * query.pageSize
  const list = filtered.slice(start, start + query.pageSize)
  return delay({ list, total: filtered.length, page: query.page, pageSize: query.pageSize })
}

/** 详情页：按 id 查完整运单信息（含轨迹）。 */
export function getDetail(id: string): Promise<WaybillDetail> {
  const base = WAYBILL_POOL.find((item) => item.id === id) ?? buildWaybill(1)
  const detail: WaybillDetail = {
    ...base,
    sender: '深圳市百运科技有限公司',
    senderPhone: '0755-88889999',
    consigneePhone: '138****6666',
    volume: Number((0.02 + (Number(base.id.split('-')[1]) % 10) * 0.006).toFixed(4)),
    remark: '易碎品，需妥善包装',
    traces: [
      { time: base.createdAt, title: '订单已创建' },
      { time: base.createdAt, title: '已揽收', desc: '快递员已上门取件' },
      { time: base.createdAt, title: '运输中', desc: '已发往目的地分拨中心' },
    ],
  }
  return delay(detail)
}

/** 详情抽屉：列表行内快速查看的精简详情。 */
export function getDrawerDetail(id: string): Promise<WaybillDrawerDetail> {
  const base = WAYBILL_POOL.find((item) => item.id === id) ?? buildWaybill(1)
  const detail: WaybillDrawerDetail = {
    ...base,
    sender: '深圳市百运科技有限公司',
    remark: '易碎品，需妥善包装',
    warning: buildDrawerWarning(base),
  }
  return delay(detail)
}

/**
 * 抽屉预警派生：异常状态 -> error 红色预警；pending 且 id 末位奇数 -> warning 橙色超时预警；其余不渲染。
 * 演示"有异常才出现"的语义色提示条，覆盖 error/warning/无预警三种态。
 */
function buildDrawerWarning(base: WaybillListItem): WaybillDrawerWarning | null {
  if (base.status === 'exception') {
    return {
      type: 'error',
      message: '该运单处于异常状态，请尽快处理',
      actionLabel: '去处理',
    }
  }
  if (base.status === 'pending') {
    const seed = Number(base.id.split('-')[1])
    if (Number.isFinite(seed) && seed % 2 === 1) {
      return {
        type: 'warning',
        message: '运单长时间未揽收，请联系快递员',
        actionLabel: '去处理',
      }
    }
  }
  return null
}

/** 表单页：提交新建/编辑，返回生成的运单编号。 */
export function submitForm(data: WaybillFormData): Promise<{ id: string; waybillNo: string }> {
  const id = data.waybillNo ?? `wb-${Date.now()}`
  const waybillNo = data.waybillNo ? data.waybillNo : `BY${Date.now()}`
  return delay({ id, waybillNo })
}

/** 仪表盘：指标卡 + 趋势/金额/占比图表 + 明细。 */
export function getDashboardStats(): Promise<DashboardStats> {
  const trend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86_400_000)
    return { date: date.toISOString().slice(0, 10), count: 40 + ((i * 17) % 60) }
  })
  const amountTrend = trend.map((t, i) => ({
    date: t.date,
    amount: Number((t.count * (180 + ((i * 13) % 40))).toFixed(2)),
  }))
  // 按业务类型聚合单量，供饼图与明细表共用
  const distribution = BIZ_TYPES.map((bizType) => ({
    bizType,
    count: WAYBILL_POOL.filter((w) => w.bizType === bizType).length,
  }))
  const detailList: DashboardDetailRow[] = distribution.map((d, i) => ({
    id: `dash-${d.bizType}`,
    bizType: d.bizType,
    count: d.count,
    amount: Number(
      WAYBILL_POOL.filter((w) => w.bizType === d.bizType)
        .reduce((sum, w) => sum + w.amount, 0)
        .toFixed(4),
    ),
    // 同比按业务线制造正负差异，覆盖升/降两种展示（首类持平偏正，间隔为负）
    yoy: Number((((i % 2 === 0 ? 1 : -1) * (5 + ((i * 7) % 18))).toFixed(2))),
  }))
  const stats: DashboardStats = {
    totalWaybills: WAYBILL_POOL.length,
    inTransitCount: WAYBILL_POOL.filter((w) => w.status === 'in_transit').length,
    exceptionCount: WAYBILL_POOL.filter((w) => w.status === 'exception').length,
    todayAmount: Number(WAYBILL_POOL.slice(0, 12).reduce((sum, w) => sum + w.amount, 0).toFixed(4)),
    kpi: {
      totalWaybills: { value: WAYBILL_POOL.length, yoy: 12.4 },
      inTransitCount: { value: 0, yoy: 6.8 },
      exceptionCount: { value: 0, yoy: -3.2 },
      todayAmount: { value: 0, yoy: 9.5 },
    },
    trend,
    amountTrend,
    distribution,
    detailList,
  }
  // KPI value 与顶层数值保持一致（避免两处漂移）
  stats.kpi.inTransitCount.value = stats.inTransitCount
  stats.kpi.exceptionCount.value = stats.exceptionCount
  stats.kpi.todayAmount.value = stats.todayAmount
  return delay(stats)
}
