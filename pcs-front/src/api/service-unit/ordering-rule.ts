/**
 * 下单限制规则 API（前端骨架阶段）
 *
 * 视图层只引用本文件，不直接 import @/mock/*：BFF 就绪后把下方函数体内的 mock 切换点
 * 改为真实请求即可，调用方（OrderingRules.view.vue）无需改动。
 *
 * 类型与 @/mock/ordering-rule 共用：单一事实来源，mock 阶段保证 mock 数据与生产契约一致。
 *
 * 适用范围 scope：
 * - global  全局规则：所有服务单元可勾选（如关税预付、香港交货、超大件、是否带电）
 * - unit    指定服务单元规则：仅对单个服务单元 / 价卡生效
 *
 * 全局规则的字段口径与 src/views/sn318/components/OrderRulePicker.biz.vue 的
 * ORDER_RULE_OPTIONS 同源，避免「服务单元编辑页可选规则」与「规则管理页」数据漂移。
 */

import * as orderingRuleMock from '@/mock/service-unit/ordering-rule'

/** 适用范围：global 全局规则 / unit 指定服务单元规则；空串用于筛选「全部」。 */
export type OrderingRuleScope = 'global' | 'unit' | ''

/** 实体状态：当前页签只展示启用，禁用分支预留给后续禁用/启用管理。 */
export type OrderingRuleStatus = 'enabled' | 'disabled'

/** 表格行：与视图列一一对应；按需扩展时新增字段保持全部可选，避免破坏旧调用。 */
export interface OrderingRuleItem {
  /** 规则编码，业务主键（行 rowKey） */
  code: string
  /** 规则名称：列表主文案 */
  name: string
  /** 规则类型：与名称同语义，但允许名称带后缀（如「关税预付-不支持国家」）时区分类型 */
  type: string
  /** 命中规则后的处理方式 */
  action: string
  /** 条件表达式（如 dutyPrepaid == true）；服务单元详情页与规则弹框都要展示 */
  expression?: string
  /** 适用范围：global 全局规则 / unit 指定服务单元规则 */
  scope: OrderingRuleScope
  /** 指定服务单元编码（仅 unit 规则有值；global 为空） */
  scopeUnitCode?: string
  /** 指定服务单元简称（仅 unit 规则有值） */
  scopeUnitName?: string
  /** 指定服务商（仅 unit 规则有值） */
  scopeProvider?: string
  /** 规则说明，仅供选择时参考 */
  description: string
  status: OrderingRuleStatus
}

/** 列表分页查询参数：scope/scopeUnitCode 全部可选，空值表示该字段不过滤。 */
export interface OrderingRuleQuery {
  scope?: OrderingRuleScope
  /** 限定指定服务单元的编码（仅当 scope='unit' 生效）；空串表示该字段不过滤。 */
  scopeUnitCode?: string
  page?: number
  pageSize?: number
}

/** 分页结果：list + total + 当前页码 + 页大小。 */
export interface OrderingRulePage {
  list: OrderingRuleItem[]
  total: number
  page: number
  pageSize: number
}

/** 「服务单元」筛选下拉的选项：由规则数据去重派生，保证选项与列表数据同源。 */
export interface OrderingRuleUnitOption {
  code: string
  name: string
  provider: string
}

/**
 * 列表页：分页查询下单限制规则。
 * 真实后端切换点：改为 `get<OrderingRulePage>('/pcs/api/ordering-rule/v1', query)`。
 */
export function listOrderingRules(query: OrderingRuleQuery = {}): Promise<OrderingRulePage> {
  return orderingRuleMock.listOrderingRules(query)
}

/**
 * 「服务单元」筛选下拉的可选项。
 * 真实后端切换点：改为 `get<OrderingRuleUnitOption[]>('/pcs/api/ordering-rule/v1/units')`。
 */
export function listOrderingRuleUnits(): Promise<OrderingRuleUnitOption[]> {
  return orderingRuleMock.listOrderingRuleUnits()
}

/**
 * 删除下单限制规则。
 * 真实后端切换点：改为 `del<void>('/pcs/api/ordering-rule/v1/' + code)`，被引用时后端应拦截。
 */
export function deleteOrderingRule(code: string): Promise<boolean> {
  return orderingRuleMock.deleteOrderingRule(code)
}
