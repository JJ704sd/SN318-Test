import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ByCard from './ByCard.vue'

describe('ByCard', () => {
  it('title prop 渲染到 header', () => {
    const wrapper = mount(ByCard, { props: { title: '标题' } })
    expect(wrapper.find('.by-card__title').text()).toBe('标题')
  })

  it('body 默认插槽渲染', () => {
    const wrapper = mount(ByCard, {
      slots: { default: '<p>内容</p>' },
    })
    expect(wrapper.find('.by-card__body').text()).toBe('内容')
  })

  it('footer 插槽有内容才渲染', () => {
    const wrapperNoFooter = mount(ByCard)
    expect(wrapperNoFooter.find('.by-card__footer').exists()).toBe(false)

    const wrapperWithFooter = mount(ByCard, {
      slots: { footer: '<button>操作</button>' },
    })
    expect(wrapperWithFooter.find('.by-card__footer').exists()).toBe(true)
  })

  it('默认态仅有 default class', () => {
    const wrapper = mount(ByCard)
    expect(wrapper.classes()).toContain('by-card--default')
    expect(wrapper.classes()).not.toContain('by-card--outlined')
    expect(wrapper.classes()).not.toContain('by-card--interactive')
  })

  it('outlined 态有 outlined class 且不是交互态', () => {
    const wrapper = mount(ByCard, { props: { variant: 'outlined' } })
    expect(wrapper.classes()).toContain('by-card--outlined')
    expect(wrapper.classes()).not.toContain('by-card--interactive')
  })

  it('interactive 态有 interactive class', () => {
    const wrapper = mount(ByCard, { props: { variant: 'interactive' } })
    expect(wrapper.classes()).toContain('by-card--interactive')
  })

  it('兼容 interactive=true 用法', () => {
    const wrapper = mount(ByCard, { props: { interactive: true } })
    expect(wrapper.classes()).toContain('by-card--interactive')
  })

  it('interactive 默认 false 时无 interactive class', () => {
    const wrapper = mount(ByCard)
    expect(wrapper.classes()).not.toContain('by-card--interactive')
  })

  it('selected 仅在 interactive 时生效', () => {
    const staticCard = mount(ByCard, { props: { selected: true } })
    expect(staticCard.classes()).not.toContain('by-card--selected')

    const interactiveCard = mount(ByCard, { props: { interactive: true, selected: true } })
    expect(interactiveCard.classes()).toContain('by-card--selected')
  })

  it('bodyPadding=false 时 body 无内边距 class', () => {
    const wrapper = mount(ByCard, { props: { bodyPadding: false } })
    expect(wrapper.find('.by-card__body--no-padding').exists()).toBe(true)
    expect(wrapper.classes()).toContain('by-card--no-padding')
  })
})
