import type { LmdListQuery, LmdPage, LmdRecord, LmdResource, LmdValue } from '@/api/lmd'
import { getMasterDataConfigByResource } from '@/views/master-data/config'
import { createLmdFixtures } from './lmd-data'

const references: Record<string, LmdResource> = {
  country_id: 'countries',
  province_id: 'provinces',
  city_id: 'cities',
  air_region_id: 'air-regions',
  zone_id: 'reference-zones',
}
const memberResources: Record<string, LmdResource> = {
  country: 'countries',
  province: 'provinces',
  city: 'cities',
  district: 'districts',
  airport: 'airports',
  port: 'ports',
  warehouse: 'warehouses',
  postal_code: 'postal-codes',
}

export function createLmdMockStore() {
  const data = createLmdFixtures()

  function table(resource: string): LmdRecord[] {
    if (!Object.hasOwn(data, resource)) throw new Error('未找到主数据对象')
    return data[resource as LmdResource]
  }

  function enrich(record: LmdRecord): LmdRecord {
    const result = { ...record }
    const parents: string[] = []
    for (const [field, resource] of Object.entries(references)) {
      const parent = data[resource].find((item) => item.id === record[field])
      if (parent?.name) {
        result[field.replace('_id', '_name')] = parent.name
        if (['country_id', 'province_id', 'city_id'].includes(field)) parents.push(parent.name)
      }
    }
    result.parent_path = parents.join(' / ')
    const memberResource = memberResources[String(record.member_type)]
    const member =
      memberResource && data[memberResource].find((item) => item.id === record.member_id)
    if (member) {
      result.member_name = member.name ?? member.postal_code ?? member.code
      if (!result.display_name) result.display_name = result.member_name
    }
    return result
  }

  function validate(resource: LmdResource, record: LmdRecord, current?: LmdRecord): void {
    const config = getMasterDataConfigByResource(resource)
    if (!config) throw new Error('未找到主数据对象')
    for (const field of config.fields) {
      const value = record[field.key]
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new Error(`请填写${field.label}`)
      }
      if (
        field.kind === 'number' &&
        value !== undefined &&
        (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0))
      ) {
        throw new Error(`${field.label}格式不正确，请重新输入`)
      }
      if (field.kind === 'lookup' && value !== undefined && value !== '') {
        const target =
          field.lookup?.resource ??
          field.lookup?.resourceMap?.[String(record[field.lookup.resourceField ?? ''])]
        const valueField = field.lookup?.valueField ?? 'id'
        if (target && !data[target].some((item) => String(item[valueField]) === String(value))) {
          throw new Error(`请选择有效的${field.label}`)
        }
      }
    }
    const uniqueFields =
      resource === 'air-region-countries'
        ? ['air_region_id', 'country_id']
        : resource === 'reference-zone-members'
          ? ['zone_id', 'member_type', 'member_id', 'include_type']
          : resource === 'postal-codes'
            ? ['country_id', 'postal_code']
            : resource === 'exchange-rates'
              ? ['from_currency_code', 'to_currency_code', 'effective_from']
              : ['code']
    if (
      table(resource).some(
        (item) => item !== current && uniqueFields.every((key) => item[key] === record[key]),
      )
    ) {
      throw new Error('记录已存在，请检查编码或关联对象')
    }
  }

  function list(resource: LmdResource, query: LmdListQuery): LmdPage {
    if (query.keyword === '__mock_error__') throw new Error('模拟查询失败，请稍后重试')
    const keyword = String(query.keyword ?? '')
      .trim()
      .toLocaleLowerCase()
    const selected = table(resource)
      .map(enrich)
      .filter((record) => {
        if (
          keyword &&
          !Object.values(record).some((value) =>
            String(value ?? '')
              .toLocaleLowerCase()
              .includes(keyword),
          )
        )
          return false
        return Object.entries(query).every(([key, value]) => {
          if (['page', 'page_size', 'keyword'].includes(key) || value === undefined || value === '')
            return true
          if (key === 'effective_date')
            return (
              String(record.effective_from ?? '') <= String(value) &&
              (!record.effective_to || String(record.effective_to) >= String(value))
            )
          return String(record[key]) === String(value)
        })
      })
    const page = Math.max(1, Math.trunc(Number(query.page) || 1))
    const pageSize = Math.min(200, Math.max(1, Math.trunc(Number(query.page_size) || 20)))
    return {
      list: selected.slice((page - 1) * pageSize, page * pageSize),
      total: selected.length,
      page,
      page_size: pageSize,
    }
  }

  function create(resource: LmdResource, payload: Record<string, LmdValue>): LmdRecord {
    const rows = table(resource)
    const record = {
      ...payload,
      id: Math.max(0, ...rows.map((item) => item.id ?? 0)) + 1,
      status: Number(payload.status ?? getMasterDataConfigByResource(resource)?.createStatus ?? 1),
      source: 'mock',
      version_no: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    validate(resource, record)
    rows.push(record)
    return enrich(record)
  }

  function find(resource: LmdResource, id: string): LmdRecord {
    const field = getMasterDataConfigByResource(resource)?.idField ?? 'id'
    const record = table(resource).find((item) => String(item[field]) === id)
    if (!record) throw new Error('记录不存在，请刷新后重试')
    return record
  }

  function update(resource: LmdResource, id: string, payload: Record<string, LmdValue>): LmdRecord {
    const record = find(resource, id)
    const next = {
      ...record,
      ...payload,
      id: record.id,
      version_no: Number(record.version_no ?? 1) + 1,
      updated_at: new Date().toISOString(),
    }
    validate(resource, next, record)
    Object.assign(record, next)
    return enrich(record)
  }

  function remove(resource: LmdResource, id: string): null {
    if (getMasterDataConfigByResource(resource)?.allowDelete === false)
      throw new Error('该对象不支持删除')
    const rows = table(resource)
    rows.splice(rows.indexOf(find(resource, id)), 1)
    return null
  }

  return { list, create, update, remove }
}
