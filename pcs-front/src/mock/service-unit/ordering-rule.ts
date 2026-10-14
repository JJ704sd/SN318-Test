/**
 * 下单限制规则假数据（前端骨架阶段）
 *
 * 与 @/api/ordering-rule.ts 共用同一套 TS 类型；只负责生成假数据 + 模拟网络延迟，
 * 不碰 axios/http（请求底座见 @core/api）。真实下单限制规则接口接入后本文件整体移除。
 *
 * 种子结构：
 * - 4 条全局规则（scope='global'）：与 OrderRulePicker.biz.vue 的 ORDER_RULE_OPTIONS 同源
 * - 18 条 D20001 KLS02 HKDHL代理 + 4 条 D20002 KLS03 SF代理 指定服务单元规则
 *
 * 所有规则状态当前均为 enabled；调用方如需禁用分支可在此扩种。
 */

import type {
  OrderingRuleItem,
  OrderingRulePage,
  OrderingRuleQuery,
} from '@/api/service-unit/ordering-rule'

/** 模拟网络延迟（ms）。 */
const MOCK_DELAY = 300

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 4 条全局规则：字段与 OrderRulePicker.biz.vue 的 ORDER_RULE_OPTIONS 保持一致。 */
const GLOBAL_RULE_SEEDS: OrderingRuleItem[] = [
  {
    code: 'duty_prepaid',
    name: '关税预付',
    type: '关税预付',
    action: '拒收',
    scope: 'global',
    description: '涉及关税预付时按下单限制校验',
    status: 'enabled',
  },
  {
    code: 'hk_delivery',
    name: '香港交货',
    type: '香港交货',
    action: '拒收',
    scope: 'global',
    description: '涉及香港交货时按下单限制校验',
    status: 'enabled',
  },
  {
    code: 'oversized',
    name: '超大件',
    type: '超大件',
    action: '转人工',
    scope: 'global',
    description: '超大件需按规则校验或转人工',
    status: 'enabled',
  },
  {
    code: 'with_battery',
    name: '是否带电',
    type: '是否带电',
    action: '拒收',
    scope: 'global',
    description: '带电按接单限制',
    status: 'enabled',
  },
]

/** 18 条 D20001 KLS02 HKDHL代理 指定服务单元规则：含截图全部 6 条 + 12 条同单元派生。 */
const KLS02_RULE_SEEDS: OrderingRuleItem[] = [
  {
    code: 'kls02_duty_prepaid_ban',
    name: '关税预付-不支持国家',
    type: '关税预付',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明2：国家要求15：哈萨克斯坦 / 乌兹别克斯坦 / 亚美尼亚 / 格鲁吉亚 / 乌克兰不支持关税预付',
    status: 'enabled',
  },
  {
    code: 'kls02_amazon_dtp',
    name: '亚马逊强制预关税预付',
    type: '关税预付',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明2：亚马逊收件需做关税预付，收款公司必须用 AMAZON',
    status: 'enabled',
  },
  {
    code: 'kls02_hk_delivery_booking',
    name: '香港交货需预约',
    type: '香港交货',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明8：需提前联系客服 CS6 预约',
    status: 'enabled',
  },
  {
    code: 'kls02_piece_999',
    name: '单件超999KG拒单',
    type: '超大件',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单件货物上限 999KG',
    status: 'enabled',
  },
  {
    code: 'kls02_ticket_1999',
    name: '单票超1999KG拒单',
    type: '超大件',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单票货物上限 1999KG',
    status: 'enabled',
  },
  {
    code: 'kls02_side_cap',
    name: '三边超限拒单',
    type: '超大件',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：三边限制 290×190×170CM',
    status: 'enabled',
  },
  {
    code: 'kls02_battery_15kg',
    name: '锂电池限15KG',
    type: '是否带电',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单票锂电池重量上限 15KG',
    status: 'enabled',
  },
  {
    code: 'kls02_battery_un38',
    name: '锂电池UN38.3报告',
    type: '是否带电',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：锂电池类货物必须提供 UN38.3 测试报告',
    status: 'enabled',
  },
  {
    code: 'kls02_value_under_5',
    name: '货值低于USD5拒收',
    type: '关税预付',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单票申报货值低于 USD5 不予受理',
    status: 'enabled',
  },
  {
    code: 'kls02_paperwork',
    name: '需提供全套清关文件',
    type: '关税预付',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明8：需提供发票、装箱单、原产地证等全套清关文件',
    status: 'enabled',
  },
  {
    code: 'kls02_oversized_dim',
    name: '三边超2.5M拒收',
    type: '超大件',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单件三边之和超过 2.5M 不予受理',
    status: 'enabled',
  },
  {
    code: 'kls02_remote_country',
    name: '偏远国家拒收',
    type: '香港交货',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：直布罗陀、马斯喀特、塞浦路斯等偏远地区暂不承运',
    status: 'enabled',
  },
  {
    code: 'kls02_amazon_collect',
    name: '亚马逊代收款',
    type: '关税预付',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明2：亚马逊平台订单需走代收款流程，收款方须为 AMAZON',
    status: 'enabled',
  },
  {
    code: 'kls02_dutiable_low',
    name: '关税预付-低货值',
    type: '关税预付',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：单票货值低于关税预付阈值不支持关税预付',
    status: 'enabled',
  },
  {
    code: 'kls02_battery_mark',
    name: '锂电池外标识',
    type: '是否带电',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：锂电池外箱必须张贴 9 类危险品标识',
    status: 'enabled',
  },
  {
    code: 'kls02_pallet_wood',
    name: '木托盘标识要求',
    type: '关税预付',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明8：使用木托盘须有 IPPC 熏蒸标识',
    status: 'enabled',
  },
  {
    code: 'kls02_hazmat_label',
    name: '危险品标识',
    type: '是否带电',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '渠道备注6：内置电池产品须在外箱张贴对应危险品类标识',
    status: 'enabled',
  },
  {
    code: 'kls02_duty_invoice',
    name: '关税发票专票要求',
    type: '关税预付',
    action: '转人工',
    scope: 'unit',
    scopeUnitCode: 'D20001',
    scopeUnitName: 'KLS02',
    scopeProvider: 'HKDHL代理',
    description: '附加费说明2：关税预付必须提供增值税专用发票',
    status: 'enabled',
  },
]

/** 4 条 D20002 KLS03 SF代理 指定服务单元规则：用于演示「服务单元」筛选下拉的真实过滤。 */
const KLS03_RULE_SEEDS: OrderingRuleItem[] = [
  {
    code: 'kls03_sf_remote',
    name: '顺丰偏远拒收',
    type: '香港交货',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20002',
    scopeUnitName: 'KLS03',
    scopeProvider: 'SF代理',
    description: '渠道备注6：顺丰偏远地区（新疆 / 西藏部分）暂不承运',
    status: 'enabled',
  },
  {
    code: 'kls03_sf_dim',
    name: '顺丰三边超2M拒收',
    type: '超大件',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20002',
    scopeUnitName: 'KLS03',
    scopeProvider: 'SF代理',
    description: '渠道备注6：单件三边之和超过 2M 不予受理',
    status: 'enabled',
  },
  {
    code: 'kls03_sf_battery',
    name: '顺丰带电拒收',
    type: '是否带电',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20002',
    scopeUnitName: 'KLS03',
    scopeProvider: 'SF代理',
    description: '渠道备注6：内置电池 / 配套电池类货物暂不承运',
    status: 'enabled',
  },
  {
    code: 'kls03_sf_value',
    name: '顺丰低货值拒收',
    type: '关税预付',
    action: '拒收',
    scope: 'unit',
    scopeUnitCode: 'D20002',
    scopeUnitName: 'KLS03',
    scopeProvider: 'SF代理',
    description: '渠道备注6：单票申报货值低于 CNY30 不予受理',
    status: 'enabled',
  },
]

/**
 * 规则类型 → 条件表达式。与「新增/编辑规则」弹框（OrderingRuleFormModal）的类型模板保持一致，
 * 避免规则管理页与新建弹框两条路径产出的表达式口径不同。
 */
const TYPE_EXPRESSION: Record<string, string> = {
  关税预付: 'dutyPrepaid == true',
  香港交货: 'deliveryPoint == "HK"',
  超大件: 'oversized == true',
  是否带电: 'hasBattery == true',
}

const RULE_POOL: OrderingRuleItem[] = [
  ...GLOBAL_RULE_SEEDS,
  ...KLS02_RULE_SEEDS,
  ...KLS03_RULE_SEEDS,
].map((rule) => ({ ...rule, expression: TYPE_EXPRESSION[rule.type] ?? '' }))

/**
 * 下单限制规则分页查询（前端骨架阶段 mock）。
 *
 * 过滤规则：
 * - scope 命中 OrderingRuleItem.scope；空值视作"全部"
 * - scopeUnitCode 仅在 scope='unit' 生效；空值视作"全部"
 * - 关键字搜索未在 image 出现，本期不实现
 *
 * 真实后端切换点：改为 `get<OrderingRulePage>('/pcs/api/ordering-rule/v1', query)`。
 */
export function listOrderingRules(query: OrderingRuleQuery = {}): Promise<OrderingRulePage> {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 10

  const filtered = RULE_POOL.filter((item) => {
    if (query.scope && item.scope !== query.scope) return false
    if (query.scope === 'unit' && query.scopeUnitCode) {
      if (item.scopeUnitCode !== query.scopeUnitCode) return false
    }
    return true
  })

  const start = (page - 1) * pageSize
  return delay({
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  })
}

/**
 * 返回 mock 中出现的「指定服务单元」去重列表，供视图「服务单元」筛选下拉驱动选项。
 * 真实后端切换点：改为 `get<Array<{ code: string; name: string }>>('/pcs/api/ordering-rule/v1/units')`。
 */
export function listOrderingRuleUnits(): Promise<Array<{ code: string; name: string; provider: string }>> {
  const seen = new Set<string>()
  const units: Array<{ code: string; name: string; provider: string }> = []
  for (const item of RULE_POOL) {
    if (item.scope !== 'unit') continue
    if (!item.scopeUnitCode || !item.scopeUnitName) continue
    const key = `${item.scopeUnitCode}/${item.scopeUnitName}`
    if (seen.has(key)) continue
    seen.add(key)
    units.push({
      code: item.scopeUnitCode,
      name: item.scopeUnitName,
      provider: item.scopeProvider ?? '',
    })
  }
  return delay(units)
}

/**
 * 删除下单限制规则（mock 内存态，刷新后由种子重建）。
 * 真实后端切换点：改为 `del<void>('/pcs/api/ordering-rule/v1/' + code)`；
 * 规则被服务单元引用时应由后端拦截，前端按返回的错误码提示。
 */
export function deleteOrderingRule(code: string): Promise<boolean> {
  const index = RULE_POOL.findIndex((item) => item.code === code)
  if (index < 0) return delay(false)
  RULE_POOL.splice(index, 1)
  return delay(true)
}
