import type { StatusType } from '@core/components'
import type { BizType } from '@core/styles/tokens'
import type { WaybillStatus } from '@/api/demo'

export const STATUS_LABEL: Record<WaybillStatus, string> = {
  pending: '待揽收',
  picked_up: '已揽收',
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}

export const STATUS_TYPE_MAP: Record<WaybillStatus, StatusType> = {
  pending: 'default',
  picked_up: 'processing',
  in_transit: 'processing',
  delivered: 'success',
  exception: 'error',
}

export const BIZ_TYPE_LABEL: Record<BizType, string> = {
  express: '快递',
  air: '空运',
  fba: 'FBA',
  line: '专线',
  sea: '海运',
  pickup: '上门取件',
  inquiry: '询价',
}
