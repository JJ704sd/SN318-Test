import type { ByTableColumn } from '@core/components'
import { lookupField, type MasterDataField, type MasterDataStatusOption } from './config'

export type MasterDataRelationKey = 'air_region_country' | 'reference_zone_member'

export interface MasterDataRelationConfig {
  key: MasterDataRelationKey
  title: string
  resource: 'air-region-countries' | 'reference-zone-members'
  parentField: 'air_region_id' | 'zone_id'
  fields: MasterDataField[]
  columns: ByTableColumn[]
  statusOptions?: MasterDataStatusOption[]
}

const BINARY_STATUS_OPTIONS: MasterDataStatusOption[] = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

export const MASTER_DATA_RELATIONS: Record<MasterDataRelationKey, MasterDataRelationConfig> = {
  air_region_country: {
    key: 'air_region_country',
    title: '国家关系',
    resource: 'air-region-countries',
    parentField: 'air_region_id',
    fields: [
      lookupField('country_id', '国家', 'countries', 'id', true),
      { key: 'status', label: '状态', kind: 'status', required: true, statusOptions: BINARY_STATUS_OPTIONS },
    ],
    columns: [
      { title: '国家', dataIndex: 'country_id', fixed: 'left', width: 160 },
      { title: '状态', dataIndex: 'status', width: 90 },
      { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' },
    ],
    statusOptions: BINARY_STATUS_OPTIONS,
  },
  reference_zone_member: {
    key: 'reference_zone_member',
    title: '成员',
    resource: 'reference-zone-members',
    parentField: 'zone_id',
    fields: [
      {
        key: 'member_type',
        label: '成员类型',
        kind: 'select',
        required: true,
        options: [
          { value: 'country', label: '国家' },
          { value: 'province', label: '省 / 州' },
          { value: 'city', label: '城市' },
          { value: 'district', label: '区县' },
          { value: 'airport', label: '机场' },
          { value: 'port', label: '港口' },
          { value: 'warehouse', label: '仓库' },
          { value: 'postal_code', label: '邮编' },
        ],
      },
      {
        key: 'member_id',
        label: '成员对象',
        kind: 'lookup',
        required: true,
        placeholder: '请先选择成员类型',
        lookup: {
          valueField: 'id',
          resourceField: 'member_type',
          resourceMap: {
            country: 'countries',
            province: 'provinces',
            city: 'cities',
            district: 'districts',
            airport: 'airports',
            port: 'ports',
            warehouse: 'warehouses',
            postal_code: 'postal-codes',
          },
        },
      },
      {
        key: 'include_type',
        label: '包含关系',
        kind: 'select',
        required: true,
        options: [{ value: 'include', label: '包含' }, { value: 'exclude', label: '排除' }],
      },
      { key: 'display_name', label: '展示名称', placeholder: '请输入展示名称' },
    ],
    columns: [
      { title: '成员类型', dataIndex: 'member_type', fixed: 'left', width: 140 },
      { title: '成员对象', dataIndex: 'member_id', width: 180 },
      { title: '包含关系', dataIndex: 'include_type', width: 120 },
      { title: '展示名称', dataIndex: 'display_name', width: 220, ellipsis: 1 },
      { title: '操作', dataIndex: 'action', fixed: 'right', width: 230, align: 'center' },
    ],
  },
}

export function getMasterDataRelationConfig(key: MasterDataRelationKey): MasterDataRelationConfig {
  return MASTER_DATA_RELATIONS[key]
}
