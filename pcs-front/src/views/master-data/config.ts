import type { ByTableColumn } from '@core/components'
import type { LmdResource } from '@/api/lmd'

export type MasterDataKey =
  | 'country'
  | 'province'
  | 'city'
  | 'district'
  | 'postal_code'
  | 'airport'
  | 'port'
  | 'warehouse'
  | 'airline'
  | 'transport_mode'
  | 'cargo_type'
  | 'packaging_type'
  | 'supervision_mode'
  | 'fee_item'
  | 'currency'
  | 'air_region'
  | 'air_region_country'
  | 'exchange_rate'
  | 'reference_zone'
  | 'reference_zone_member'

export type MasterDataFieldKind = 'text' | 'number' | 'status' | 'select' | 'date' | 'lookup'

export interface MasterDataLookupConfig {
  resource?: LmdResource
  valueField: 'id' | 'code'
  queryFields?: Record<string, string>
  resourceField?: string
  resourceMap?: Partial<Record<string, LmdResource>>
}

export interface MasterDataOption {
  label: string
  value: string | number
}

export interface MasterDataStatusOption {
  label: string
  value: number
}

export interface MasterDataField {
  key: string
  label: string
  kind?: MasterDataFieldKind
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  statusOptions?: MasterDataStatusOption[]
  options?: MasterDataOption[]
  lookup?: MasterDataLookupConfig
}

export interface MasterDataConfig {
  key: MasterDataKey
  title: string
  resource: LmdResource
  idField: 'id' | 'code'
  fields: MasterDataField[]
  columns: ByTableColumn[]
  visibleInMenu?: boolean
  allowDelete?: boolean
  statusOptions?: MasterDataStatusOption[]
  createStatus?: number
  activeStatus?: number
  disabledStatus?: number
}

export interface MasterDataGroup {
  key: 'location' | 'dictionary' | 'fee' | 'finance' | 'routing'
  title: string
  resources: MasterDataKey[]
}

export const MASTER_DATA_GROUPS: MasterDataGroup[] = [
  {
    key: 'location',
    title: '行政与地点',
    resources: ['country', 'province', 'city', 'district', 'postal_code', 'airport', 'port', 'warehouse'],
  },
  {
    key: 'dictionary',
    title: '业务字典',
    resources: ['airline', 'transport_mode', 'cargo_type', 'packaging_type', 'supervision_mode'],
  },
  {
    key: 'fee',
    title: '费用项',
    resources: ['fee_item'],
  },
  {
    key: 'finance',
    title: '币种与汇率',
    resources: ['currency', 'exchange_rate'],
  },
  {
    key: 'routing',
    title: '航线区域与 Zone',
    resources: ['air_region', 'reference_zone'],
  },
]

const text = (key: string, label: string, required = false): MasterDataField => ({
  key,
  label,
  required,
  placeholder: `请输入${label}`,
})

const number = (key: string, label: string, required = false): MasterDataField => ({
  key,
  label,
  kind: 'number',
  required,
  placeholder: `请输入${label}`,
  min: 0,
})

export const lookupField = (
  key: string,
  label: string,
  resource: LmdResource,
  valueField: 'id' | 'code' = 'id',
  required = false,
  queryFields?: Record<string, string>,
): MasterDataField => ({
  key,
  label,
  kind: 'lookup',
  required,
  placeholder: `请选择${label}`,
  lookup: { resource, valueField, queryFields },
})

const BINARY_STATUS_OPTIONS: MasterDataStatusOption[] = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

const ZONE_STATUS_OPTIONS: MasterDataStatusOption[] = [
  { value: 0, label: '待生效' },
  { value: 1, label: '启用' },
  { value: 2, label: '停用' },
]

const status = (options = BINARY_STATUS_OPTIONS): MasterDataField => ({
  key: 'status',
  label: '状态',
  kind: 'status',
  required: true,
  statusOptions: options,
})

const baseColumns = (extra: ByTableColumn[] = []): ByTableColumn[] => [
  { title: '编码', dataIndex: 'code', fixed: 'left', width: 150, ellipsis: 1 },
  { title: '名称', dataIndex: 'name', width: 180, ellipsis: 1 },
  ...extra,
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' },
]

export const MASTER_DATA_CONFIGS: Record<MasterDataKey, MasterDataConfig> = {
  country: {
    key: 'country', title: '国家', resource: 'countries', idField: 'code',
    fields: [text('code', '国家编码', true), text('name', '中文名称', true), text('name_en', '英文名称'), status()],
    columns: baseColumns(),
  },
  province: {
    key: 'province', title: '省 / 州', resource: 'provinces', idField: 'id',
    fields: [lookupField('country_id', '国家', 'countries', 'id', true), text('code', '省州编码', true), text('name', '名称', true), text('name_en', '英文名称'), status()],
    columns: baseColumns([{ title: '国家', dataIndex: 'country_id', width: 150 }]),
  },
  city: {
    key: 'city', title: '城市', resource: 'cities', idField: 'id',
    fields: [lookupField('country_id', '国家', 'countries', 'id', true), lookupField('province_id', '省 / 州', 'provinces', 'id', false, { country_id: 'country_id' }), text('code', '城市编码', true), text('name', '名称', true), text('name_en', '英文名称'), status()],
    columns: baseColumns([{ title: '国家', dataIndex: 'country_id', width: 150 }, { title: '省 / 州', dataIndex: 'province_id', width: 150 }]),
  },
  district: {
    key: 'district', title: '区县', resource: 'districts', idField: 'id',
    fields: [lookupField('city_id', '城市', 'cities', 'id', true), text('code', '区县编码', true), text('name', '名称', true), text('name_en', '英文名称'), status()],
    columns: baseColumns([{ title: '城市', dataIndex: 'city_id', width: 150 }]),
  },
  postal_code: {
    key: 'postal_code', title: '邮编', resource: 'postal-codes', idField: 'id',
    fields: [lookupField('country_id', '国家', 'countries', 'id', true), text('postal_code', '邮编', true), text('postal_code_end', '邮编结束值'), status()],
    columns: [{ title: '邮编', dataIndex: 'postal_code', fixed: 'left', width: 150 }, { title: '结束邮编', dataIndex: 'postal_code_end', width: 150 }, { title: '国家', dataIndex: 'country_id', width: 150 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' }],
  },
  airport: {
    key: 'airport', title: '机场', resource: 'airports', idField: 'code',
    fields: [text('code', 'IATA 编码', true), text('icao_code', 'ICAO 编码'), text('name', '名称', true), text('name_en', '英文名称'), lookupField('country_id', '国家', 'countries', 'id', true), lookupField('city_id', '城市', 'cities', 'id', false, { country_id: 'country_id' }), status()],
    columns: baseColumns([{ title: 'ICAO', dataIndex: 'icao_code', width: 100 }, { title: '国家', dataIndex: 'country_id', width: 150 }, { title: '城市', dataIndex: 'city_id', width: 150 }]),
  },
  port: {
    key: 'port', title: '港口', resource: 'ports', idField: 'code',
    fields: [text('code', '港口编码', true), text('name', '名称', true), text('name_en', '英文名称'), lookupField('country_id', '国家', 'countries', 'id', true), lookupField('city_id', '城市', 'cities', 'id', false, { country_id: 'country_id' }), status()],
    columns: baseColumns([{ title: '国家', dataIndex: 'country_id', width: 150 }, { title: '城市', dataIndex: 'city_id', width: 150 }]),
  },
  warehouse: {
    key: 'warehouse', title: '仓库', resource: 'warehouses', idField: 'code',
    fields: [text('code', '仓库编码', true), text('name', '名称', true), text('name_en', '英文名称'), lookupField('country_id', '国家', 'countries', 'id', true), lookupField('city_id', '城市', 'cities', 'id', false, { country_id: 'country_id' }), text('address', '地址'), status()],
    columns: baseColumns([{ title: '国家', dataIndex: 'country_id', width: 150 }, { title: '城市', dataIndex: 'city_id', width: 150 }, { title: '地址', dataIndex: 'address', width: 220, ellipsis: 1 }]),
  },
  airline: {
    key: 'airline', title: '航空公司', resource: 'airlines', idField: 'code',
    fields: [text('code', 'IATA 编码', true), text('icao_code', 'ICAO 编码'), text('name', '名称', true), text('name_en', '英文名称'), lookupField('country_id', '国家', 'countries', 'id'), status()],
    columns: baseColumns([{ title: 'ICAO', dataIndex: 'icao_code', width: 100 }, { title: '国家', dataIndex: 'country_id', width: 150 }]),
  },
  transport_mode: {
    key: 'transport_mode', title: '运输方式', resource: 'transport-modes', idField: 'code',
    fields: [text('code', '运输方式编码', true), text('name', '名称', true), status()],
    columns: baseColumns(),
  },
  cargo_type: {
    key: 'cargo_type', title: '货物类型', resource: 'cargo-types', idField: 'code',
    fields: [text('code', '货物类型编码', true), text('name', '名称', true), text('description', '说明'), status()],
    columns: baseColumns([{ title: '说明', dataIndex: 'description', width: 240, ellipsis: 1 }]),
  },
  packaging_type: {
    key: 'packaging_type', title: '包装类型', resource: 'packaging-types', idField: 'code',
    fields: [text('code', '包装类型编码', true), text('name', '名称', true), text('description', '说明'), status()],
    columns: baseColumns([{ title: '说明', dataIndex: 'description', width: 240, ellipsis: 1 }]),
  },
  supervision_mode: {
    key: 'supervision_mode', title: '监管方式', resource: 'supervision-modes', idField: 'code',
    fields: [text('code', '监管方式编码', true), text('name', '名称', true), text('description', '说明'), status()],
    columns: baseColumns([{ title: '说明', dataIndex: 'description', width: 240, ellipsis: 1 }]),
  },
  fee_item: {
    key: 'fee_item', title: '费用项', resource: 'fee-items', idField: 'code',
    fields: [text('code', '费用项编码', true), text('name', '名称', true), text('name_en', '英文名称'), text('group_code', '分组编码', true), text('default_currency_code', '默认币种', true), status()],
    columns: baseColumns([{ title: '分组', dataIndex: 'group_code', width: 120 }, { title: '默认币种', dataIndex: 'default_currency_code', width: 120 }]),
  },
  currency: {
    key: 'currency', title: '币种', resource: 'currencies', idField: 'code',
    fields: [text('code', 'ISO 4217 编码', true), text('name', '名称', true), text('name_en', '英文名称'), text('symbol', '符号'), number('decimal_digits', '小数位数', true), status()],
    columns: baseColumns([{ title: '符号', dataIndex: 'symbol', width: 90 }, { title: '小数位', dataIndex: 'decimal_digits', width: 100 }]),
  },
  air_region: {
    key: 'air_region', title: '航线区域', resource: 'air-regions', idField: 'code',
    fields: [text('code', '区域编码', true), text('name', '名称', true), status()],
    columns: baseColumns(),
  },
  air_region_country: {
    key: 'air_region_country', title: '航线区域国家关系', resource: 'air-region-countries', idField: 'id', visibleInMenu: false,
    fields: [lookupField('air_region_id', '航线区域', 'air-regions', 'id', true), lookupField('country_id', '国家', 'countries', 'id', true), status()],
    columns: [{ title: '航线区域', dataIndex: 'air_region_id', fixed: 'left', width: 160 }, { title: '国家', dataIndex: 'country_id', width: 150 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' }],
  },
  exchange_rate: {
    key: 'exchange_rate', title: '汇率', resource: 'exchange-rates', idField: 'id', allowDelete: false,
    fields: [lookupField('from_currency_code', '源币种', 'currencies', 'code', true), lookupField('to_currency_code', '目标币种', 'currencies', 'code', true), number('rate', '直接倍率', true), { key: 'effective_from', label: '生效日', kind: 'date', required: true }, { key: 'effective_to', label: '结束日', kind: 'date' }, status()],
    columns: [{ title: '源币种', dataIndex: 'from_currency_code', fixed: 'left', width: 120 }, { title: '目标币种', dataIndex: 'to_currency_code', width: 120 }, { title: '直接倍率', dataIndex: 'rate', width: 150 }, { title: '生效日', dataIndex: 'effective_from', width: 130 }, { title: '结束日', dataIndex: 'effective_to', width: 130 }, { title: '状态', dataIndex: 'status', width: 90 }, { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' }],
  },
  reference_zone: {
    key: 'reference_zone', title: 'Zone', resource: 'reference-zones', idField: 'code',
    fields: [
      text('code', 'Zone 编码', true),
      text('name', '名称', true),
      { key: 'carrier_scope', label: '服务商范围', kind: 'select', required: true, options: [{ label: '通用', value: 'common' }, { label: 'UPS', value: 'ups' }, { label: 'FedEx', value: 'fedex' }, { label: 'DHL', value: 'dhl' }, { label: '自营', value: 'self' }] },
      text('scheme_code', '方案编码', true),
      text('remark', '备注'),
      status(ZONE_STATUS_OPTIONS),
    ],
    columns: baseColumns([{ title: '服务商范围', dataIndex: 'carrier_scope', width: 130 }, { title: '方案编码', dataIndex: 'scheme_code', width: 130 }, { title: '版本', dataIndex: 'version_no', width: 90 }]),
    statusOptions: ZONE_STATUS_OPTIONS,
    createStatus: 0,
    activeStatus: 1,
    disabledStatus: 2,
  },
  reference_zone_member: {
    key: 'reference_zone_member', title: 'Zone 成员', resource: 'reference-zone-members', idField: 'id', visibleInMenu: false,
    fields: [lookupField('zone_id', 'Zone', 'reference-zones', 'id', true), text('member_type', '成员类型', true), {
      key: 'member_id',
      label: '成员对象',
      kind: 'lookup',
      required: true,
      lookup: {
        valueField: 'id',
        resourceField: 'member_type',
        resourceMap: { country: 'countries', province: 'provinces', city: 'cities', district: 'districts', airport: 'airports', port: 'ports', warehouse: 'warehouses', postal_code: 'postal-codes' },
      },
    }, text('include_type', '包含关系', true), text('display_name', '展示名称')],
    columns: [{ title: 'Zone', dataIndex: 'zone_id', fixed: 'left', width: 150 }, { title: '成员类型', dataIndex: 'member_type', width: 140 }, { title: '成员对象', dataIndex: 'member_id', width: 180 }, { title: '包含关系', dataIndex: 'include_type', width: 120 }, { title: '展示名称', dataIndex: 'display_name', width: 220 }, { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' }],
  },
}

export const MASTER_DATA_KEYS = Object.keys(MASTER_DATA_CONFIGS) as MasterDataKey[]

export function getMasterDataConfig(key: string): MasterDataConfig | undefined {
  return MASTER_DATA_CONFIGS[key as MasterDataKey]
}

export function getMasterDataConfigByResource(resource: LmdResource): MasterDataConfig | undefined {
  return Object.values(MASTER_DATA_CONFIGS).find((config) => config.resource === resource)
}

export function getMasterDataGroup(key: string): MasterDataGroup | undefined {
  return MASTER_DATA_GROUPS.find((group) => group.resources.includes(key as MasterDataKey))
}

export function statusText(value: unknown, options = BINARY_STATUS_OPTIONS): string {
  const numericValue = typeof value === 'string' ? Number(value) : value
  return options.find((option) => option.value === numericValue)?.label ?? '未知'
}
