/**
 * 服务单元假数据（前端骨架阶段）
 *
 * 与 @/api/service-unit/service-unit.ts 共用同一套 TS 类型；只负责生成假数据 + 模拟网络延迟，
 * 不碰 axios/http（请求底座见 @core/api）。真实服务单元接口接入后本文件整体移除。
 *
 * 种子只写「每条各不相同」的字段；接单 / 截单时间与服务时段都由 serviceTime 文案解析而来
 * （单一事实来源，避免两处时间对不上），履约抛比由 KG/CBM 反算（同一口径的两种写法），
 * 每日容量与审计信息按覆盖范围分组，价卡信息按编码派生。
 */

import {
  formatDimRatio,
  kgCbmToDimFactor,
  type ServiceUnitCoverage,
  type ServiceUnitItem,
  type ServiceUnitPage,
  type ServiceUnitQuery,
  type ServiceUnitServiceSegment,
  type ServiceUnitStatus,
} from '@/api/service-unit/service-unit'

/** 模拟网络延迟（ms）。 */
const MOCK_DELAY = 300

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 一周顺序，用于把「周一—周五」这类区间展开成具体星期。 */
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 单个种子：只写每条不同的字段，其余由下方映射补齐。 */
interface RawServiceUnitSeed {
  code: string
  name: string
  providerName: string
  coverage: ServiceUnitCoverage
  kgPerCbm: string
  /** 展示文案，形如「周一—周五 08:30—17:30」；服务时段与接单 / 截单时间均从此解析 */
  serviceTime: string
  /** 货物准入类型，取值同编辑页 GOODS_TYPE_OPTIONS */
  goodsTypes: string[]
  /** 操作内容 */
  operationContent: string
  /** 关联的下单限制规则编码，取值须存在于 @/mock/service-unit/ordering-rule */
  orderRuleCodes: string[]
  status: ServiceUnitStatus
}

/**
 * 解析「周一—周五 08:30—17:30」：星期支持单日（周一）、区间（周一—周五）、
 * 多日（周二、周四）三种写法，时间取破折号前后的起止。
 */
function parseServiceTime(serviceTime: string): { days: string[]; start: string; end: string } {
  const [dayText = '', timeText = ''] = serviceTime.split(' ')
  const [start = '', end = ''] = timeText.split('—')
  if (dayText.includes('、')) return { days: dayText.split('、'), start, end }

  const [from = '', to] = dayText.split('—')
  const fromIndex = WEEK_DAYS.indexOf(from)
  const toIndex = to === undefined ? fromIndex : WEEK_DAYS.indexOf(to)
  if (fromIndex < 0 || toIndex < fromIndex) return { days: [dayText], start, end }
  return { days: WEEK_DAYS.slice(fromIndex, toIndex + 1), start, end }
}

/** 服务商名称 → 编码（供应商主数据由外部系统维护，这里只做映射）。 */
const PROVIDER_CODE: Record<string, string> = {
  取送易: 'SP-1001',
  云途物流: 'SP-1002',
  中外运跨境电商: 'SP-1003',
  'DHL 电商小包': 'SP-1004',
  测试虚拟供应商: 'SP-1005',
  递四方: 'SP-1006',
  京东国际: 'SP-1007',
  燕文物流: 'SP-1008',
  'UPS 国际电商': 'SP-1009',
  'Royal Mail': 'SP-1010',
  日本邮便: 'SP-1011',
}

/** 每日容量与审计信息按覆盖范围分组：同类服务段的运营口径接近，不必逐条重复。 */
const COVERAGE_PROFILE: Record<string, { dailyCapacity: string; updatedBy: string; updatedAt: string }> = {
  A: { dailyCapacity: '8000', updatedBy: '王琳', updatedAt: '2026-09-18 10:24' },
  B: { dailyCapacity: '12000', updatedBy: '陈昊', updatedAt: '2026-09-11 16:40' },
  C: { dailyCapacity: '6000', updatedBy: '李静', updatedAt: '2026-09-22 09:05' },
  D: { dailyCapacity: '24000', updatedBy: '周鹏', updatedAt: '2026-09-05 14:18' },
  E: { dailyCapacity: '10000', updatedBy: '吴倩', updatedAt: '2026-09-19 11:32' },
  F: { dailyCapacity: '9000', updatedBy: '赵宇', updatedAt: '2026-09-25 17:06' },
}

/** 尚未绑定单元成本价卡：让详情页的琥珀色 banner 分支可达。 */
const UNBOUND_CODES = new Set(['SU-B002', 'SU-C003', 'SU-D002', 'SU-E002'])

/** 已绑定价卡的有效期（mock 统一一段）。 */
const PRICE_CARD_PERIOD = { start: '2026-01-01', end: '2026-12-31' }

/** 种子服务单元：覆盖 A—F 六类服务范围与启用 / 停用两种状态。 */
const RAW_SEEDS: RawServiceUnitSeed[] = [
  // A 国内揽收
  {
    code: 'SU-A001',
    name: '深圳-香港陆运',
    providerName: '取送易',
    coverage: 'A',
    kgPerCbm: '200',
    serviceTime: '周一—周日 09:00—18:00',
    goodsTypes: ['普货', '电子产品', '带弱磁产品'],
    operationContent: '深圳仓提货后经深圳湾口岸转关至香港仓，当日达；含两地车牌与转关单证。',
    // 附带一条指定服务单元规则，用于演示详情页「下单限制」里的单元专属规则
    orderRuleCodes: ['duty_prepaid', 'hk_delivery', 'kls02_remote_country'],
    status: 'enabled',
  },
  {
    code: 'SU-A002',
    name: '广州机场集运',
    providerName: '云途物流',
    coverage: 'A',
    kgPerCbm: '167',
    serviceTime: '周一—周五 08:30—17:30',
    goodsTypes: ['普货', '纺织产品', '塑料产品'],
    operationContent: '珠三角工厂提货集运至广州机场仓，交仓后由空运渠道出运。',
    orderRuleCodes: ['duty_prepaid'],
    status: 'enabled',
  },
  {
    code: 'SU-A003',
    name: '义乌-上海港卡车',
    providerName: '取送易',
    coverage: 'A',
    kgPerCbm: '200',
    serviceTime: '周一—周日 08:00—20:00',
    goodsTypes: ['普货', '玩具产品', '木制产品'],
    operationContent: '义乌市场提货后整车运至上海港，支持拼柜与整柜装柜。',
    orderRuleCodes: ['oversized'],
    status: 'enabled',
  },
  {
    code: 'SU-A004',
    name: '宁波港集运',
    providerName: '云途物流',
    coverage: 'A',
    kgPerCbm: '167',
    serviceTime: '周一—周日 08:00—20:00',
    goodsTypes: ['普货', '塑料产品', '木箱'],
    operationContent: '宁波港周边工厂集货，按船期截港时间送仓。',
    orderRuleCodes: ['oversized', 'hk_delivery'],
    status: 'enabled',
  },
  // B 库内操作
  {
    code: 'SU-B001',
    name: '保税仓入库',
    providerName: '中外运跨境电商',
    coverage: 'B',
    kgPerCbm: '300',
    serviceTime: '周一—周日 00:00—24:00',
    goodsTypes: ['普货', '电子产品', '带电产品'],
    operationContent: '保税仓到货验收、拆箱清点、上架与库存登记。',
    orderRuleCodes: ['with_battery'],
    status: 'enabled',
  },
  {
    code: 'SU-B002',
    name: '海外仓上架',
    providerName: 'DHL 电商小包',
    coverage: 'B',
    kgPerCbm: '500',
    serviceTime: '周二—周六 09:00—18:00',
    goodsTypes: ['普货', '纺织产品'],
    operationContent: '海外仓到仓拆柜、清点上架与库位分配。',
    orderRuleCodes: [],
    status: 'disabled',
  },
  {
    code: 'SU-B003',
    name: '虚拟仓分拨',
    providerName: '测试虚拟供应商',
    coverage: 'B',
    kgPerCbm: '500',
    serviceTime: '周一—周日 00:00—24:00',
    goodsTypes: ['普货'],
    operationContent: '虚拟仓仅做账面对转与库位映射，不产生实际操作。',
    orderRuleCodes: [],
    status: 'enabled',
  },
  // C 报关操作
  {
    code: 'SU-C001',
    name: '出口报关-电子产品',
    providerName: '递四方',
    coverage: 'C',
    kgPerCbm: '200',
    serviceTime: '周一—周五 09:00—17:00',
    goodsTypes: ['电子产品', '带弱磁产品', '带电产品'],
    operationContent: '出口报关单制作、电子底账申报与单证复核。',
    orderRuleCodes: ['duty_prepaid'],
    status: 'enabled',
  },
  {
    code: 'SU-C002',
    name: '进口清关-普货',
    providerName: '京东国际',
    coverage: 'C',
    kgPerCbm: '200',
    serviceTime: '周一—周日 09:00—21:00',
    goodsTypes: ['普货', '食品'],
    operationContent: '进口清关资料审核、税费代缴与放行跟进。',
    orderRuleCodes: ['duty_prepaid'],
    status: 'enabled',
  },
  {
    code: 'SU-C003',
    name: '出口报关-纺织',
    providerName: '燕文物流',
    coverage: 'C',
    kgPerCbm: '200',
    serviceTime: '周一—周五 09:00—17:00',
    goodsTypes: ['纺织产品', '穿戴纺织品'],
    operationContent: '纺织品出口报关与商检配合，含成分申报。',
    orderRuleCodes: [],
    status: 'disabled',
  },
  // D 干线运输
  {
    code: 'SU-D001',
    name: '中欧班列-集装箱',
    providerName: '中外运跨境电商',
    coverage: 'D',
    kgPerCbm: '167',
    serviceTime: '周一 09:00—18:00',
    goodsTypes: ['普货', '木箱'],
    operationContent: '中欧班列整柜发运，成都 / 西安始发，含箱管与铁路运单。',
    orderRuleCodes: ['oversized'],
    status: 'enabled',
  },
  {
    code: 'SU-D002',
    name: '中亚卡车干线',
    providerName: 'Royal Mail',
    coverage: 'D',
    kgPerCbm: '200',
    serviceTime: '周二、周四 09:00—18:00',
    goodsTypes: ['普货', '塑料产品'],
    operationContent: '中亚方向整车干线，霍尔果斯口岸出境。',
    orderRuleCodes: [],
    status: 'enabled',
  },
  {
    code: 'SU-D003',
    name: '中欧卡航-拼箱',
    providerName: '递四方',
    coverage: 'D',
    kgPerCbm: '167',
    serviceTime: '周三、周五 09:00—18:00',
    goodsTypes: ['普货', '木制产品'],
    operationContent: '中欧卡航拼箱，按周发车，波兰 / 德国口岸入境。',
    orderRuleCodes: ['oversized'],
    status: 'enabled',
  },
  // E 清关操作
  {
    code: 'SU-E001',
    name: '美国清关-海运',
    providerName: 'UPS 国际电商',
    coverage: 'E',
    kgPerCbm: '300',
    serviceTime: '周一—周五 09:00—18:00',
    goodsTypes: ['普货', '电子烟'],
    operationContent: '美国海运进口清关，含 FDA / FCC 申报配合与关税预付。',
    orderRuleCodes: ['duty_prepaid', 'with_battery', 'kls02_battery_15kg'],
    status: 'enabled',
  },
  {
    code: 'SU-E002',
    name: '欧盟清关-空运',
    providerName: 'DHL 电商小包',
    coverage: 'E',
    kgPerCbm: '167',
    serviceTime: '周一—周日 09:00—18:00',
    goodsTypes: ['普货', '带电产品'],
    operationContent: '欧盟空运进口清关与 VAT 递延申报。',
    orderRuleCodes: [],
    status: 'disabled',
  },
  {
    code: 'SU-E003',
    name: '英国清关-海运',
    providerName: 'Royal Mail',
    coverage: 'E',
    kgPerCbm: '300',
    serviceTime: '周一—周五 09:00—18:00',
    goodsTypes: ['普货', '食品'],
    operationContent: '英国海运进口清关，含 CDS 申报与关税代缴。',
    orderRuleCodes: ['duty_prepaid'],
    status: 'enabled',
  },
  // F 尾程服务
  {
    code: 'SU-F001',
    name: '美国 FBA 派送',
    providerName: 'UPS 国际电商',
    coverage: 'F',
    kgPerCbm: '200',
    serviceTime: '周一—周日 09:00—18:00',
    goodsTypes: ['普货', '电子产品'],
    operationContent: '美国 FBA 仓库预约派送，含 ISA 预约与到仓确认。',
    orderRuleCodes: ['with_battery', 'oversized'],
    status: 'enabled',
  },
  {
    code: 'SU-F002',
    name: '日本 FBA 派送',
    providerName: '日本邮便',
    coverage: 'F',
    kgPerCbm: '200',
    serviceTime: '周一—周六 09:00—17:00',
    goodsTypes: ['普货', '电子产品'],
    operationContent: '日本 FBA 派送，含通关手续代办与仓配预约。',
    orderRuleCodes: ['with_battery'],
    status: 'enabled',
  },
  {
    code: 'SU-F003',
    name: '欧洲 FBA 派送',
    providerName: 'Royal Mail',
    coverage: 'F',
    kgPerCbm: '200',
    serviceTime: '周一—周五 09:00—18:00',
    goodsTypes: ['普货', '纺织产品'],
    operationContent: '欧洲多国 FBA 派送，按国家分拨并回传签收节点。',
    orderRuleCodes: ['duty_prepaid'],
    status: 'enabled',
  },
  {
    code: 'SU-F004',
    name: '美国末端-快递',
    providerName: 'UPS 国际电商',
    coverage: 'F',
    kgPerCbm: '200',
    serviceTime: '周一—周日 09:00—18:00',
    goodsTypes: ['普货', '带电产品'],
    operationContent: '美国末端快递派送，支持住宅派送与签收回传。',
    orderRuleCodes: ['with_battery'],
    status: 'enabled',
  },
]

/** 由原始种子推导出完整记录：时间解析、分组字段与派生字段都在这里补齐。 */
const SERVICE_UNIT_SEEDS: ServiceUnitItem[] = RAW_SEEDS.map((seed) => {
  const profile = COVERAGE_PROFILE[seed.coverage] ?? {
    dailyCapacity: '',
    updatedBy: '',
    updatedAt: '',
  }
  const { days, start, end } = parseServiceTime(seed.serviceTime)
  const serviceSegments: ServiceUnitServiceSegment[] = [{ days, start, end }]
  const bound = !UNBOUND_CODES.has(seed.code)

  return {
    code: seed.code,
    name: seed.name,
    providerName: seed.providerName,
    providerCode: PROVIDER_CODE[seed.providerName] ?? '',
    coverage: seed.coverage,
    // 履约抛比与 KG/CBM 是同一口径的两种写法（KG/CBM = 1000000 / 抛比），由 KG/CBM 反算，避免两处手填不一致
    fulfillmentRatio: formatDimRatio(kgCbmToDimFactor(Number(seed.kgPerCbm))),
    kgPerCbm: seed.kgPerCbm,
    serviceTime: seed.serviceTime,
    orderTime: start,
    deadline: end,
    serviceSegments,
    goodsTypes: seed.goodsTypes,
    dailyCapacity: profile.dailyCapacity,
    operationContent: seed.operationContent,
    orderRuleCodes: seed.orderRuleCodes,
    priceCardStatus: bound ? 'bound' : 'unbound',
    ...(bound
      ? {
          priceCardCode: `CC-${seed.code}`,
          priceCardName: `${seed.name} 单元成本价卡`,
          priceCardStart: PRICE_CARD_PERIOD.start,
          priceCardEnd: PRICE_CARD_PERIOD.end,
        }
      : {}),
    status: seed.status,
    updatedBy: profile.updatedBy,
    updatedAt: profile.updatedAt,
  }
})

/**
 * 服务单元分页查询（前端骨架阶段 mock）。
 *
 * 过滤规则：
 * - scope 命中 coverage；空值视作"全部"
 * - status 严格相等；空值视作"全部"
 * - keyword 忽略大小写，命中 名称 / 编码 / 服务商 任一即可
 *
 * 真实后端切换点：改为 `get<ServiceUnitPage>('/pcs/api/service-unit/v1', query)`。
 */
export function listServiceUnits(query: ServiceUnitQuery = {}): Promise<ServiceUnitPage> {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 20
  const keyword = query.keyword?.trim().toLowerCase() ?? ''

  const filtered = SERVICE_UNIT_SEEDS.filter((item) => {
    if (query.scope && item.coverage !== query.scope) return false
    if (query.status && item.status !== query.status) return false
    if (keyword) {
      const hit = [item.name, item.code, item.providerName].some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(keyword),
      )
      if (!hit) return false
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
 * 按编码取单条（详情页 / 编辑页）。
 * 真实后端切换点：改为 `get<ServiceUnitItem>('/pcs/api/service-unit/v1/' + code)`。
 */
export function getServiceUnit(code: string): Promise<ServiceUnitItem | undefined> {
  return delay(SERVICE_UNIT_SEEDS.find((item) => item.code === code))
}

/**
 * 切换实体状态。停用即原型里的「禁用编排」：不再出现在新建编排 / 组合的选用列表，
 * 已编入产品的历史链路保留（文案见调用方）。
 *
 * mock 只改内存：刷新页面后由种子重建，不落任何持久化。
 * 真实后端切换点：改为 `patch<ServiceUnitItem>('/pcs/api/service-unit/v1/' + code, { status })`。
 */
export function setServiceUnitStatus(
  code: string,
  status: ServiceUnitStatus,
): Promise<ServiceUnitItem | undefined> {
  const record = SERVICE_UNIT_SEEDS.find((item) => item.code === code)
  if (!record) return delay(undefined)
  record.status = status
  return delay(record)
}
