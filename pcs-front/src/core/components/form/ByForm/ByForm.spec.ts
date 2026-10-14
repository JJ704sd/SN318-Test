import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Form as AForm, FormItem as AFormItem, Input as AInput } from '@arco-design/web-vue'
import ByForm from './ByForm.vue'

function mountForm(props: Record<string, unknown> = {}) {
  return mount(ByForm, {
    props: { model: { name: '' }, ...props },
    global: { components: { AForm, AFormItem, AInput } },
    slots: {
      default: `
        <a-form-item field="name" label="姓名" :rules="[{ required: true, message: '请填写姓名' }]">
          <a-input />
        </a-form-item>
      `,
    },
  })
}

describe('ByForm', () => {
  it('cols=2 时有双列 class', () => {
    const wrapper = mountForm({ cols: 2 })
    expect(wrapper.classes()).toContain('by-form--double-col')
  })

  it('cols=1（默认）无双列 class', () => {
    const wrapper = mountForm()
    expect(wrapper.classes()).not.toContain('by-form--double-col')
  })

  it('maxWidth 生效为 style', () => {
    const wrapper = mountForm({ maxWidth: 720 })
    expect(wrapper.attributes('style')).toContain('720px')
  })

  it('maxWidth=false 时不设置 max-width 且有 fluid class', () => {
    const wrapper = mountForm({ maxWidth: false })
    expect(wrapper.attributes('style')).toBeUndefined()
    expect(wrapper.classes()).toContain('by-form--fluid')
  })

  it('resetFields 经 ref 可调用且不报错', () => {
    const wrapper = mountForm()
    expect(() =>
      (wrapper.vm as unknown as { resetFields: () => void }).resetFields(),
    ).not.toThrow()
  })

  it('clearValidate 经 ref 可调用且不报错', () => {
    const wrapper = mountForm()
    expect(() =>
      (wrapper.vm as unknown as { clearValidate: () => void }).clearValidate(),
    ).not.toThrow()
  })

  it('validateFields 返回含 firstField 的校验错误', async () => {
    const wrapper = mountForm()
    const vm = wrapper.vm as unknown as {
      validateFields: (fields: string[]) => Promise<Record<string, unknown>>
    }
    const errors = await vm.validateFields(['name'])
    expect(errors).toBeTruthy()
    expect(Object.keys(errors as object)).toContain('name')
  })
})
