import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BySafeImage from './BySafeImage.vue'

describe('BySafeImage', () => {
  it('src 为空时直接渲染降级态', () => {
    const wrapper = mount(BySafeImage, { props: { alt: '空图' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.by-safe-image__placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('空图')
  })

  it('有 src 时初始为 loading 态并渲染 img', () => {
    const wrapper = mount(BySafeImage, { props: { src: '/a.png' } })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('.by-safe-image__skeleton').exists()).toBe(true)
  })

  it('img load 事件后切换为成功态，骨架消失', async () => {
    const wrapper = mount(BySafeImage, { props: { src: '/a.png' } })
    await wrapper.find('img').trigger('load')
    expect(wrapper.find('.by-safe-image__skeleton').exists()).toBe(false)
    expect(wrapper.find('.by-safe-image__placeholder').exists()).toBe(false)
  })

  it('img error 事件后切换为降级态，不渲染 img', async () => {
    const wrapper = mount(BySafeImage, { props: { src: '/broken.png', alt: '失败图' } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.by-safe-image__placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('失败图')
  })

  it('src 动态变化后重置状态', async () => {
    const wrapper = mount(BySafeImage, { props: { src: '/a.png' } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)

    await wrapper.setProps({ src: '/b.png' })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('.by-safe-image__skeleton').exists()).toBe(true)
  })
})
