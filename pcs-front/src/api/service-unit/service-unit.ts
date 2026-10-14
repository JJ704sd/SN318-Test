/**
 * 服务单元 API（前端骨架阶段）
 *
 * 视图层只引用本文件，不直接 import @/mock/*：BFF 就绪后把下方函数体内的 mock 切换点
 * 改为真实请求即可，调用方（ServiceUnit.view.vue）无需改动。
 *
 * 类型与 @/mock/service-unit 共用：单一事实来源，mock 阶段保证 mock 数据与生产契约一致。
 */

import * as serviceUnitMock from '@/mock/service-unit/service-unit'

/** 覆盖范围代码：A 国内揽收 / B 库内操作 / C 报关操作 / D 干线运输 / E 清关操作 / F 尾程服务；空串 = 全部。 */
export type ServiceUnitCoverage = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | ''

/** 实体状态：服务单元本身只有启用 / 停用两态；价卡「生效中」是独立字段。 */
export type ServiceUnitStatus = 'enabled' | 'disabled'

/** 价卡绑定状态：bound 已绑定单元成本价卡 / unbound 尚未绑定。 */
export type ServiceUnitPriceCardStatus = 'bound' | 'unbound'

/** 单个服务时段：与 ServiceTimeEditor 的 ServiceSegment 结构一致，便于直接回填表单。 */
export interface ServiceUnitServiceSegment {
  days: string[]
  start: string
  end: string
}

/** 表格行 + 详情页字段；列表只用到其中一部分。新增字段保持可选，避免破坏旧调用。 */
export interface ServiceUnitItem {
  /** 服务单元编码，业务主键（行 rowKey） */
  code: string
  name: string
  /** 服务商名称（列表展示用） */
  providerName: string
  /** 服务商编码（编辑表单 providerCode 用；供应商主数据由外部系统维护） */
  providerCode?: string
  coverage: ServiceUnitCoverage
  /** 履约抛比，展示用字符串（如 1:1.2） */
  fulfillmentRatio: string
  kgPerCbm: string
  /** 服务时间展示文案（如 周一—周日 09:00—18:00） */
  serviceTime: string
  /** 每日接单起始时间 HH:mm */
  orderTime: string
  /** 每日截单时间 HH:mm */
  deadline?: string
  /** 结构化服务时段；详情展示走 serviceTime，编辑回填走本字段 */
  serviceSegments?: ServiceUnitServiceSegment[]
  /** 货物准入类型，取值与表单 GOODS_TYPE_OPTIONS 一致 */
  goodsTypes?: string[]
  /** 每日负载容量（KG），展示用字符串 */
  dailyCapacity?: string
  /** 操作内容说明 */
  operationContent?: string
  /** 关联的下单限制规则编码 */
  orderRuleCodes?: string[]
  /** 价卡绑定状态：驱动详情页价卡 banner 的两种形态 */
  priceCardStatus?: ServiceUnitPriceCardStatus
  priceCardCode?: string
  priceCardName?: string
  priceCardStart?: string
  priceCardEnd?: string
  status: ServiceUnitStatus
  /** 最后更新人 / 更新时间（详情页审计信息） */
  updatedBy?: string
  updatedAt?: string
}

/** 列表分页查询参数：scope/status/keyword 全部可选，空值表示该字段不过滤。 */
export interface ServiceUnitQuery {
  scope?: ServiceUnitCoverage
  status?: ServiceUnitStatus
  keyword?: string
  page?: number
  pageSize?: number
}

/** 分页结果：list + total + 当前页码。 */
export interface ServiceUnitPage {
  list: ServiceUnitItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 列表页：分页查询服务单元。
 * 真实后端切换点：改为 `get<ServiceUnitPage>('/pcs/api/service-unit/v1', query)`。
 */
export function listServiceUnits(query: ServiceUnitQuery = {}): Promise<ServiceUnitPage> {
  return serviceUnitMock.listServiceUnits(query)
}

/** 换算结果保留两位小数，与原型 formatRatioNumber 同口径。 */
function roundRatio(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 履约抛比 → KG/CBM：1000000 / 抛比（与原型同口径，抛比 5000 → 200 KG/CBM）。
 * 抛比非正数时返回 0，由调用方按「未填」处理。
 */
export function dimFactorToKgCbm(dimFactor: number): number {
  return dimFactor > 0 ? roundRatio(1000000 / dimFactor) : 0
}

/** KG/CBM → 履约抛比：1000000 / KG/CBM，与 dimFactorToKgCbm 互为反算。 */
export function kgCbmToDimFactor(kgPerCbm: number): number {
  return kgPerCbm > 0 ? roundRatio(1000000 / kgPerCbm) : 0
}

/** 履约抛比的展示写法「1:<抛比>」，列表与详情共用。 */
export function formatDimRatio(dimFactor: number): string {
  return dimFactor > 0 ? `1:${String(roundRatio(dimFactor))}` : ''
}

/**
 * 详情页 / 编辑页：按编码取单条服务单元。
 * 真实后端切换点：改为 `get<ServiceUnitItem>('/pcs/api/service-unit/v1/' + code)`。
 */
export function getServiceUnit(code: string): Promise<ServiceUnitItem | undefined> {
  return serviceUnitMock.getServiceUnit(code)
}

/**
 * 切换实体状态（停用即「禁用编排」）。
 * 真实后端切换点：改为 `patch<ServiceUnitItem>('/pcs/api/service-unit/v1/' + code, { status })`。
 */
export function setServiceUnitStatus(
  code: string,
  status: ServiceUnitStatus,
): Promise<ServiceUnitItem | undefined> {
  return serviceUnitMock.setServiceUnitStatus(code, status)
}
