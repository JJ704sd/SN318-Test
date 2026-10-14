/**
 * 供应商主数据假数据（前端骨架阶段）
 *
 * 与 @/api/supplier.ts 共用同一套 TS 类型；只负责生成假数据 + 模拟网络延迟，
 * 不碰 axios/http（请求底座见 @core/api）。真实供应商接口（百运主数据）接入后本文件整体移除。
 */

import type { SupplierPage, SupplierQuery, SupplierRecord, SupplierType } from '@/api/supplier/supplier'

/** 模拟网络延迟（ms）。 */
const MOCK_DELAY = 300

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** 供应商种子：覆盖国内 / 国外 / 虚拟三类，名称、编码、代码均可被关键词命中。 */
interface SupplierSeed {
  /** 供应商编码（业务主键） */
  code: string
  /** 供应商名称 */
  name: string
  type: SupplierType
}

const SUPPLIER_SEEDS: SupplierSeed[] = [
  { code: 'SUP-QSY', name: '取送易', type: 'domestic' },
  { code: 'SUP-YT', name: '云途物流', type: 'domestic' },
  { code: 'SUP-YW', name: '燕文物流', type: 'domestic' },
  { code: 'SUP-4PX', name: '递四方', type: 'domestic' },
  { code: 'SUP-ZWY', name: '中外运跨境电商', type: 'domestic' },
  { code: 'SUP-JD', name: '京东国际', type: 'domestic' },
  { code: 'SUP-DHL', name: 'DHL 电商小包', type: 'overseas' },
  { code: 'SUP-RM', name: 'Royal Mail', type: 'overseas' },
  { code: 'SUP-UPS', name: 'UPS 国际电商', type: 'overseas' },
  { code: 'SUP-JP', name: '日本邮便', type: 'overseas' },
  { code: 'SUP-V01', name: '测试虚拟供应商', type: 'virtual' },
  { code: 'SUP-V02', name: '内部虚拟供应商', type: 'virtual' },
]

/** 供应商池：seed 派生 id 与短代码，保证同一条记录多次读取一致。 */
const SUPPLIER_POOL: SupplierRecord[] = SUPPLIER_SEEDS.map((seed, index) => ({
  id: index + 1,
  supplier_code: seed.code,
  supplier_name: seed.name,
  code: seed.code.replace('SUP-', ''),
  supplier_type: seed.type,
}))

/** 关键词（名称 / 编码 / 代码，忽略大小写）+ 分页过滤，模拟真实供应商列表接口行为。 */
export function searchSuppliers(query: SupplierQuery = {}): Promise<SupplierPage> {
  const page = query.page ?? 1
  const pageSize = query.page_size ?? 20
  const keyword = query.keyword?.trim().toLowerCase() ?? ''

  const filtered = keyword === ''
    ? SUPPLIER_POOL
    : SUPPLIER_POOL.filter((item) => [item.supplier_name, item.supplier_code, item.code].some(
      (field) => typeof field === 'string' && field.toLowerCase().includes(keyword),
    ))

  const start = (page - 1) * pageSize
  return delay({
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
  })
}
