import { del, get, patch, post } from '@core/api'

/** LMD 资源编码。资源名同时用于 API 路径、页面配置和权限编码。 */
export type LmdResource =
  | 'countries'
  | 'provinces'
  | 'cities'
  | 'districts'
  | 'postal-codes'
  | 'airports'
  | 'ports'
  | 'warehouses'
  | 'airlines'
  | 'transport-modes'
  | 'cargo-types'
  | 'packaging-types'
  | 'supervision-modes'
  | 'fee-items'
  | 'currencies'
  | 'air-regions'
  | 'air-region-countries'
  | 'exchange-rates'
  | 'reference-zones'
  | 'reference-zone-members'

export type LmdValue = string | number | boolean | null | undefined

/** 页面表格使用的 LMD 记录。服务端资源字段各不相同，公共字段保持强类型。 */
export interface LmdRecord {
  id?: number
  code?: string
  name?: string
  name_en?: string
  status?: number
  source?: string
  [key: string]: LmdValue
}

export interface LmdPage<T extends LmdRecord = LmdRecord> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export type LmdListQuery = Record<string, string | number | undefined>

const LMD_API_PREFIX = '/pcs/api/lmd/v1'

function resourceUrl(resource: LmdResource, id?: string | number): string {
  const base = `${LMD_API_PREFIX}/${resource}`
  return id === undefined ? base : `${base}/${encodeURIComponent(String(id))}`
}

export function listLmdRecords(
  resource: LmdResource,
  query: LmdListQuery,
): Promise<LmdPage> {
  return get<LmdPage>(resourceUrl(resource), query)
}

export function createLmdRecord(
  resource: LmdResource,
  payload: Record<string, LmdValue>,
): Promise<LmdRecord> {
  return post<LmdRecord>(resourceUrl(resource), payload)
}

export function updateLmdRecord(
  resource: LmdResource,
  id: string | number,
  payload: Record<string, LmdValue>,
): Promise<LmdRecord> {
  return patch<LmdRecord>(resourceUrl(resource, id), payload)
}

export function deleteLmdRecord(resource: LmdResource, id: string | number): Promise<null> {
  return del<null>(resourceUrl(resource, id))
}
