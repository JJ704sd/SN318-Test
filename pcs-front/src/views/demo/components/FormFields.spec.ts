import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { FieldRule, FileItem } from '@arco-design/web-vue'
import { describe, expect, it } from 'vitest'
import FormFields from './FormFields.biz.vue'
import type { WaybillFormData } from '@/api/demo'

const INITIAL: WaybillFormData = {
  bizType: 'express',
  destination: '',
  consignee: '',
  consigneePhone: '',
  shipDate: '',
  weight: 0,
  amount: 0,
  insured: false,
  remark: '',
}

const RULES: Record<string, FieldRule[]> = {
  bizType: [{ required: true, message: '请选择业务类型' }],
  destination: [{ required: true, message: '请输入目的地' }],
  shipDate: [{ required: true, message: '请选择发货日期' }],
  consignee: [],
  consigneePhone: [],
  weight: [],
  amount: [],
}

const BIZ_OPTIONS = [
  { label: '快递', value: 'express' as const },
  { label: '海运', value: 'sea' as const },
]

function stub(tag: string, name: string) {
  return {
    name,
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<div data-test="${tag}" />`,
  }
}

const stubs = {
  'a-form-item': {
    name: 'a-form-item',
    props: ['rules'],
    template: '<div data-test="fi" :data-rules="String((rules ?? []).length)"><slot /></div>',
  },
  'a-select': stub('c-select', 'a-select'),
  'a-option': { name: 'a-option', template: '<span />' },
  'a-input': stub('c-input', 'a-input'),
  'a-date-picker': stub('c-date', 'a-date-picker'),
  'a-input-number': stub('c-number', 'a-input-number'),
  'a-switch': stub('c-switch', 'a-switch'),
  'a-textarea': stub('c-textarea', 'a-textarea'),
  ByUpload: {
    name: 'ByUpload',
    props: ['fileList'],
    emits: ['update:fileList'],
    template: '<div data-test="c-upload" />',
  },
}

function mountFields(activeStep = -1) {
  return mount(FormFields, {
    props: {
      modelValue: { ...INITIAL },
      rules: RULES,
      bizOptions: BIZ_OPTIONS,
      accept: '.xlsx',
      maxSize: 10,
      maxCount: 3,
      activeStep,
      fileList: [] as FileItem[],
    },
    global: { stubs },
  })
}

describe('FormFields.biz（受控 modelValue 数据流）', () => {
  it('single 模式（activeStep=-1）渲染全部字段并透传必填规则', () => {
    const wrapper = mountFields(-1)
    const fields = wrapper.findAll('[data-test="fi"]')
    // 基本信息 3 + 物流信息 2 + 费用信息 5（含附件/备注）
    expect(fields).toHaveLength(10)
    // 首个字段 bizType 的必填规则透传到 a-form-item
    expect(fields[0]!.attributes('data-rules')).toBe('1')
  })

  it('stepped 模式按 activeStep 分段渲染', async () => {
    const wrapper = mountFields(0)
    expect(wrapper.findAll('[data-test="fi"]')).toHaveLength(3)
    await wrapper.setProps({ activeStep: 1 })
    expect(wrapper.findAll('[data-test="fi"]')).toHaveLength(2)
    await wrapper.setProps({ activeStep: 2 })
    expect(wrapper.findAll('[data-test="fi"]')).toHaveLength(5)
  })

  it('字段编辑经 update:modelValue 回传新数据对象（不直接改 prop）', async () => {
    const wrapper = mountFields(-1)
    wrapper.findAllComponents({ name: 'a-input' })[0]!.vm.$emit('update:modelValue', '美国·洛杉矶')
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const payload = emitted?.[0]?.[0] as WaybillFormData
    expect(payload).not.toBe(wrapper.props('modelValue')) // 回传新对象引用
    expect(payload.destination).toBe('美国·洛杉矶')
    expect(payload.bizType).toBe('express') // 其余字段保留
  })

  it('bizType 选择回传', async () => {
    const wrapper = mountFields(-1)
    wrapper.findAllComponents({ name: 'a-select' })[0]!.vm.$emit('update:modelValue', 'sea')
    await nextTick()
    const payload = wrapper.emitted('update:modelValue')?.[0]?.[0] as WaybillFormData
    expect(payload.bizType).toBe('sea')
  })

  it('附件列表经 fileList defineModel 双向同步', async () => {
    const wrapper = mountFields(-1)
    const item: FileItem = { uid: '1', name: 'a.xlsx', status: 'done' }
    wrapper.findAllComponents({ name: 'ByUpload' })[0]!.vm.$emit('update:fileList', [item])
    await nextTick()
    expect(wrapper.emitted('update:fileList')?.[0]?.[0]).toEqual([item])
  })
})
