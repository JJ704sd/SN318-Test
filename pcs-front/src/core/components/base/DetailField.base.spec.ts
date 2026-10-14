import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import DetailField from './DetailField.base.vue'

const global = { components: { AButton } }

/** 覆写 jsdom 元素滚动/可视高度，模拟文本溢出。 */
function stubOverflow(el: Element, scrollHeight: number, clientHeight: number) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
}

describe('DetailField.base', () => {
  it('渲染 label', () => {
    const wrapper = mount(DetailField, { props: { label: '到货地' }, global })
    expect(wrapper.find('.detail-field__label').text()).toBe('到货地')
  })

  it('渲染 value 为文本', () => {
    const wrapper = mount(DetailField, {
      props: { label: '到货地', value: '深圳' },
      global,
    })
    expect(wrapper.find('.detail-field__text').text()).toBe('深圳')
  })

  it('默认插槽覆盖 value', () => {
    const wrapper = mount(DetailField, {
      props: { label: '到货地', value: '深圳' },
      slots: { default: '<b>插槽内容</b>' },
      global,
    })
    expect(wrapper.find('.detail-field__text').text()).toBe('插槽内容')
  })

  it('clamp 默认 3 → text-ellipsis-3', () => {
    const wrapper = mount(DetailField, { props: { label: 'x', value: 'v' }, global })
    expect(wrapper.find('.detail-field__text').classes()).toContain('text-ellipsis-3')
  })

  it('clamp=2 → text-ellipsis-2', () => {
    const wrapper = mount(DetailField, {
      props: { label: 'x', value: 'v', clamp: 2 },
      global,
    })
    expect(wrapper.find('.detail-field__text').classes()).toContain('text-ellipsis-2')
  })

  it('未溢出时不渲染展开按钮', async () => {
    const wrapper = mount(DetailField, { props: { label: 'x', value: 'v' }, global })
    expect(wrapper.find('.detail-field__toggle').exists()).toBe(false)
  })

  it('溢出时渲染展开按钮，点击后收起并去掉省略号 class', async () => {
    const wrapper = mount(DetailField, { props: { label: 'x', value: 'long' }, global })

    const textEl = wrapper.find('.detail-field__text').element
    stubOverflow(textEl, 120, 40)
    // 触发 onUpdated 重新 measure
    await wrapper.setProps({ label: 'y' })

    expect(wrapper.find('.detail-field__toggle').exists()).toBe(true)
    expect(wrapper.find('.detail-field__toggle').text()).toBe('展开')

    await wrapper.find('.detail-field__toggle').trigger('click')
    expect(wrapper.find('.detail-field__toggle').text()).toBe('收起')
    expect(wrapper.find('.detail-field__text').classes()).not.toContain('text-ellipsis-3')
  })

  it('展开态下再次更新 prop 不重算溢出（按钮保持收起文案）', async () => {
    const wrapper = mount(DetailField, { props: { label: 'x', value: 'long' }, global })

    const textEl = wrapper.find('.detail-field__text').element
    stubOverflow(textEl, 120, 40)
    await wrapper.setProps({ label: 'y' })
    await wrapper.find('.detail-field__toggle').trigger('click') // 展开

    // 展开态下 measure 提前 return，overflowing 不会被重设
    await wrapper.setProps({ label: 'z' })
    expect(wrapper.find('.detail-field__toggle').text()).toBe('收起')
  })
})
