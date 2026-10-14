import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AiTag from './AiTag.vue'

describe('AiTag', () => {
  it('默认态：渲染四芒星图标 + 默认文案「AI 生成」（text 非空 -> showText=true）', () => {
    const wrapper = mount(AiTag)
    expect(wrapper.find('.ai-tag').exists()).toBe(true)
    expect(wrapper.find('.ai-tag__icon').exists()).toBe(true)
    expect(wrapper.find('.ai-tag__text').exists()).toBe(true)
    expect(wrapper.find('.ai-tag__text').text()).toBe('AI 生成')
  })

  it('传 text 覆盖默认文案（无插槽，text 非空分支）', () => {
    const wrapper = mount(AiTag, { props: { text: 'AI 建议' } })
    expect(wrapper.find('.ai-tag__text').text()).toBe('AI 建议')
  })

  it('text 为空且无插槽时退化为纯图标标记（showText=false）', () => {
    const wrapper = mount(AiTag, { props: { text: '' } })
    expect(wrapper.find('.ai-tag__text').exists()).toBe(false)
    // 图标仍在
    expect(wrapper.find('.ai-tag__icon').exists()).toBe(true)
  })

  it('提供默认插槽时以插槽内容渲染（slots.default 分支），text 仅作回退', () => {
    const wrapper = mount(AiTag, { slots: { default: 'AI 预填' } })
    expect(wrapper.find('.ai-tag__text').exists()).toBe(true)
    expect(wrapper.find('.ai-tag__text').text()).toBe('AI 预填')
  })

  it('size=small 时挂上 small class 且更紧凑', () => {
    const wrapper = mount(AiTag, { props: { size: 'small' } })
    expect(wrapper.find('.ai-tag').classes()).toContain('ai-tag--small')
  })

  it('默认 size 不挂 small class', () => {
    const wrapper = mount(AiTag)
    expect(wrapper.find('.ai-tag').classes()).not.toContain('ai-tag--small')
  })
})
