import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, it, expect, vi } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import ByErrorBoundary from './ByErrorBoundary.vue'

const global = { components: { AButton } }

/** 渲染即抛错的子组件。 */
const Throwing = defineComponent({
  render() {
    throw new Error('boom')
  },
})

/**
 * 受控子组件：外部切换 shouldThrow 后，边界重试重新渲染该子组件时会读到最新值，
 * 用于验证「重试后恢复默认 slot」。
 */
let shouldThrow = true
const Flaky = defineComponent({
  render() {
    if (shouldThrow) throw new Error('boom')
    return h('p', { class: 'recovered' }, 'recovered')
  },
})

describe('ByErrorBoundary', () => {
  it('无错误时渲染默认 slot 且不出现错误态', () => {
    const wrapper = mount(ByErrorBoundary, {
      slots: { default: '<p class="ok">content</p>' },
      global,
    })
    expect(wrapper.find('.ok').text()).toBe('content')
    expect(wrapper.find('.by-empty').exists()).toBe(false)
  })

  it('子组件渲染抛错时进入错误态并 emit error', async () => {
    const onError = vi.fn<(err: Error) => void>()
    const wrapper = mount(ByErrorBoundary, {
      slots: { default: Throwing },
      global,
      attrs: { onError },
    }) as VueWrapper
    await nextTick()
    expect(wrapper.find('.by-empty').exists()).toBe(true)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('description prop 透传到错误态描述', async () => {
    const wrapper = mount(ByErrorBoundary, {
      props: { description: '自定义降级文案' },
      slots: { default: Throwing },
      global,
    }) as VueWrapper
    await nextTick()
    expect(wrapper.find('.by-empty__desc').text()).toBe('自定义降级文案')
  })

  it('错误态渲染重试按钮', async () => {
    const wrapper = mount(ByErrorBoundary, {
      slots: { default: Throwing },
      global,
    }) as VueWrapper
    await nextTick()
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('重试')
  })

  it('点击重试后错误态清除并恢复默认 slot', async () => {
    shouldThrow = true
    const wrapper = mount(ByErrorBoundary, {
      slots: { default: Flaky },
      global,
    }) as VueWrapper
    await nextTick()
    expect(wrapper.find('.by-empty').exists()).toBe(true)

    shouldThrow = false
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('.by-empty').exists()).toBe(false)
    expect(wrapper.find('.recovered').text()).toBe('recovered')
  })
})
