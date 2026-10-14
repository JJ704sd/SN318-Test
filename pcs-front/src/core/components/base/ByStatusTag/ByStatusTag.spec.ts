import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ByStatusTag from './ByStatusTag.vue'

describe('ByStatusTag', () => {
  it.each([
    ['processing', 'by-status-tag--processing'],
    ['success', 'by-status-tag--success'],
    ['warning', 'by-status-tag--warning'],
    ['error', 'by-status-tag--error'],
    ['default', 'by-status-tag--default'],
  ] as const)('status=%s 映射语义 class', (status, cls) => {
    const wrapper = mount(ByStatusTag, {
      props: { status, text: status },
    })
    expect(wrapper.find('.by-status-tag').classes()).toContain(cls)
  })

  it('size=small 时有 small class', () => {
    const wrapper = mount(ByStatusTag, {
      props: { status: 'success', size: 'small' },
    })
    expect(wrapper.find('.by-status-tag--small').exists()).toBe(true)
  })

  it('size=default 时无 small class，且不产生与 status 撞名的 --default size class', () => {
    const wrapper = mount(ByStatusTag, {
      props: { status: 'success', size: 'default' },
    })
    const classes = wrapper.find('.by-status-tag').classes()
    expect(classes).toContain('by-status-tag--success')
    expect(classes).not.toContain('by-status-tag--small')
    // size=default 不得再挂 by-status-tag--default，否则会盖住 success 色
    expect(classes.filter((c) => c === 'by-status-tag--default')).toHaveLength(0)
  })

  it('status=default 时仍有中性态 class', () => {
    const wrapper = mount(ByStatusTag, {
      props: { status: 'default', text: '已关闭' },
    })
    expect(wrapper.find('.by-status-tag').classes()).toContain('by-status-tag--default')
  })

  it('slot 内容优先于 text prop', () => {
    const wrapper = mount(ByStatusTag, {
      props: { status: 'success', text: '文字' },
      slots: { default: '插槽内容' },
    })
    expect(wrapper.text()).toBe('插槽内容')
  })

  it('无 slot 时显示 text prop', () => {
    const wrapper = mount(ByStatusTag, {
      props: { status: 'error', text: '失败' },
    })
    expect(wrapper.text()).toBe('失败')
  })
})
