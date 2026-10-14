import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AiAvatar from './AiAvatar.vue'
import defaultAvatar from '@core/assets/yunxiaoxing_avatar@3x.png'

describe('AiAvatar', () => {
  it('默认态：md 尺寸、使用内置占位形象、默认文案「运小星」', () => {
    const wrapper = mount(AiAvatar)
    expect(wrapper.find('.ai-avatar').exists()).toBe(true)
    expect(wrapper.find('.ai-avatar').classes()).toContain('ai-avatar--md')
    const img = wrapper.find('.ai-avatar__img')
    expect(img.attributes('alt')).toBe('运小星')
    // 未传 src 时回落到内置全彩形象（src || defaultAvatar 的 falsy 分支）
    expect(img.attributes('src')).toBe(defaultAvatar)
  })

  it('传自定义 src 时优先使用自定义形象（src || defaultAvatar 的 truthy 分支）', () => {
    const wrapper = mount(AiAvatar, { props: { src: '/custom/avatar.png' } })
    expect(wrapper.find('.ai-avatar__img').attributes('src')).toBe('/custom/avatar.png')
  })

  it('size=sm / size=lg 映射对应预设 class', () => {
    const sm = mount(AiAvatar, { props: { size: 'sm' } })
    expect(sm.find('.ai-avatar').classes()).toContain('ai-avatar--sm')
    expect(sm.find('.ai-avatar').classes()).not.toContain('ai-avatar--md')

    const lg = mount(AiAvatar, { props: { size: 'lg' } })
    expect(lg.find('.ai-avatar').classes()).toContain('ai-avatar--lg')
  })

  it('传自定义 alt 覆盖默认文案', () => {
    const wrapper = mount(AiAvatar, { props: { alt: '我的助手' } })
    expect(wrapper.find('.ai-avatar__img').attributes('alt')).toBe('我的助手')
  })
})
