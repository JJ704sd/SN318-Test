import type { ByTableColumn, StatusType } from '@baiyun/template-core/components'
import type { BizType } from '@baiyun/template-core/tokens'
import type { WaybillStatus } from '@/api/demo'

export const BIZ_TYPE_OPTIONS: Array<{ label: string; value: BizType }> = [
  { label: '快递', value: 'express' },
  { label: '空运', value: 'air' },
  { label: 'FBA', value: 'fba' },
  { label: '专线', value: 'line' },
  { label: '海运', value: 'sea' },
  { label: '上门取件', value: 'pickup' },
  { label: '询价', value: 'inquiry' },
]

export const STATUS_OPTIONS: Array<{ label: string; value: WaybillStatus }> = [
  { label: '待揽收', value: 'pending' },
  { label: '已揽收', value: 'picked_up' },
  { label: '运输中', value: 'in_transit' },
  { label: '已签收', value: 'delivered' },
  { label: '异常', value: 'exception' },
]

export const STATUS_LABEL: Record<WaybillStatus, string> = {
  pending: '待揽收',
  picked_up: '已揽收',
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}

const STATUS_TYPE_MAP: Record<WaybillStatus, StatusType> = {
  pending: 'default',
  picked_up: 'processing',
  in_transit: 'processing',
  delivered: 'success',
  exception: 'error',
}

export function getStatusType(status: WaybillStatus): StatusType {
  return STATUS_TYPE_MAP[status]
}

// 列宽：table-layout fixed 下显式宽度决定列的最低占位；状态/渠道保持同宽；总宽超出容器时出现横向滚动，
// 固定列（运单号/状态/操作）在滚动时吸附左右两侧，容器足够宽时表格仍撑满 100%
export const columns: ByTableColumn[] = [
  { title: '运单号', dataIndex: 'waybillNo', fixed: 'left', ellipsis: 1, width: 160 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '渠道', dataIndex: 'bizType', width: 90 },
  { title: '重量', dataIndex: 'weight', valueType: 'weight', align: 'right', width: 120 },
  { title: '运费', dataIndex: 'amount', valueType: 'money', align: 'right', width: 130 },
  { title: '目的地', dataIndex: 'destination', ellipsis: 1, width: 180 },
  { title: '下单时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'action', fixed: 'right', align: 'center', width: 120 },
]

/** 完整表格的列总宽度，用于在窄屏下启用横向滚动。 */
export const LIST_TABLE_SCROLL_WIDTH = columns.reduce(
  (total, column) => total + (column.width ?? 0),
  0,
)
