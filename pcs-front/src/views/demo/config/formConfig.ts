import type { FieldRule } from '@arco-design/web-vue'
import type { BizType } from '@baiyun/template-core/tokens'
import type { WaybillFormData } from '@/api/demo'

/** 业务类型下拉选项（与 listConfig 的口径一致）。 */
export const BIZ_TYPE_OPTIONS: Array<{ label: string; value: BizType }> = [
  { label: '快递', value: 'express' },
  { label: '空运', value: 'air' },
  { label: 'FBA', value: 'fba' },
  { label: '专线', value: 'line' },
  { label: '海运', value: 'sea' },
  { label: '上门取件', value: 'pickup' },
  { label: '询价', value: 'inquiry' },
]

/** 附件上传约束。 */
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png'
export const ATTACHMENT_MAX_SIZE = 10
export const ATTACHMENT_MAX_COUNT = 5

const PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 各字段校验规则（提交前 validate 使用）。 */
export const formRules: Record<string, FieldRule[]> = {
  bizType: [{ required: true, message: '请选择业务类型' }],
  destination: [{ required: true, message: '请填写目的地' }],
  consignee: [{ required: true, message: '请填写收件人' }],
  consigneePhone: [
    { required: true, message: '请填写收件人电话' },
    { match: PHONE_PATTERN, message: '收件人电话格式不正确，请重新输入' },
  ],
  shipDate: [{ required: true, message: '请选择发货日期' }],
  weight: [
    { required: true, message: '请填写重量' },
    { type: 'number', min: 0.001, message: '重量需大于 0' },
  ],
  amount: [
    { required: true, message: '请填写金额' },
    { type: 'number', min: 0, message: '金额不能为负数' },
  ],
}

/** 分步模式下各步骤包含的字段（用于逐步校验）。 */
export const STEP_FIELDS: string[][] = [
  ['bizType', 'destination', 'shipDate'],
  ['consignee', 'consigneePhone'],
  ['weight', 'amount'],
]

/** 新建时的表单初值。 */
export function createEmptyForm(): WaybillFormData {
  return {
    bizType: 'express',
    destination: '',
    consignee: '',
    consigneePhone: '',
    shipDate: '',
    weight: 0,
    amount: 0,
    insured: false,
    remark: '',
    attachments: [],
  }
}
