/**
 * 供应商主数据 API（只读引用）。
 *
 * 供应商主数据由百运系统维护，本系统只做编码映射和引用展示，不提供写入流程。
 * BFF 尚未提供供应商路由，本文件暂时转发 @/mock/supplier 假数据；
 * 真实接口接入后把各函数内注释的切换点改成真实请求即可，调用方（SupplierLookupSelect）无需改动。
 */

import * as supplierMock from '@/mock/supplier/supplier'

/** 供应商类型：国内 / 国外 / 虚拟。 */
export type SupplierType = 'domestic' | 'overseas' | 'virtual'

/** 供应商主数据记录；未确认字段保持可选，避免约束尚未定稿的外部契约。 */
export interface SupplierRecord {
  id?: number
  /** 供应商编码，业务主键（表单落库取该值） */
  supplier_code?: string
  /** 供应商名称，下拉展示用 */
  supplier_name?: string
  /** 供应商代码（部分上游系统用短码，可不返回） */
  code?: string
  supplier_type?: SupplierType | string
  [key: string]: string | number | undefined
}

/** 供应商分页结果。 */
export interface SupplierPage {
  list: SupplierRecord[]
  total: number
  page: number
  page_size: number
}

/** 供应商查询条件：关键词命中名称 / 编码 / 代码。 */
export interface SupplierQuery {
  keyword?: string
  page?: number
  page_size?: number
}

/**
 * 查询供应商列表（默认首页 20 条），供下拉远程检索与已选值回显使用。
 * 真实后端切换点：改为实际接口。
 */
export function listSuppliers(query: SupplierQuery = {}): Promise<SupplierPage> {
  return supplierMock.searchSuppliers(query)
}
