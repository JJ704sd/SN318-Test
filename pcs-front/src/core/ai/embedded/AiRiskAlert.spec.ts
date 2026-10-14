import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import AiRiskAlert from './AiRiskAlert.vue'

// 子件最小化：AiTag 就近 stub（本组件只关心其文案透传），Arco 图标直接 stub
const stubs = {
  AiTag: { template: '<span class="ai-tag-stub">{{ text }}</span>', props: ['text', 'size'] },
  'icon-close': true,
}

function mountAlert(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(AiRiskAlert, {
    props,
    slots,
    global: { components: { AButton }, stubs },
  })
}

describe('AiRiskAlert', () => {
  it('默认态：warning 警告色、内嵌 AiTag「AI 风险提示」，无 title/desc/evidence/actions/关闭按钮', () => {
    const wrapper = mountAlert()
    expect(wrapper.find('.ai-risk-alert').classes()).not.toContain('ai-risk-alert--high')
    expect(wrapper.find('.ai-risk-alert').attributes('role')).toBe('alert')
    expect(wrapper.find('.ai-tag-stub').text()).toBe('AI 风险提示')
    expect(wrapper.find('.ai-risk-alert__title').exists()).toBe(false)
    expect(wrapper.find('.ai-risk-alert__desc').exists()).toBe(false)
    expect(wrapper.find('.ai-risk-alert__evidence').exists()).toBe(false)
    expect(wrapper.find('.ai-risk-alert__actions').exists()).toBe(false)
    expect(wrapper.find('.ai-risk-alert__close').exists()).toBe(false)
  })

  it('level=high 时挂 high 强调 class（仍为警告色系，无 error 语义）', () => {
    const wrapper = mountAlert({ level: 'high' })
    expect(wrapper.find('.ai-risk-alert').classes()).toContain('ai-risk-alert--high')
  })

  it('传 title 时渲染标题', () => {
    const wrapper = mountAlert({ title: '运单可能延误' })
    expect(wrapper.find('.ai-risk-alert__title').text()).toBe('运单可能延误')
  })

  it('传 description 时渲染风险描述', () => {
    const wrapper = mountAlert({ description: '近 30 天同线路货机准点率 92%' })
    expect(wrapper.find('.ai-risk-alert__desc').text()).toBe('近 30 天同线路货机准点率 92%')
  })

  it('传 evidence 时渲染风险依据（AI 非黑盒）', () => {
    const wrapper = mountAlert({ evidence: '基于近 30 天 128 条运单' })
    expect(wrapper.find('.ai-risk-alert__evidence').text()).toBe('基于近 30 天 128 条运单')
  })

  it('提供 actions 插槽时渲染操作区', () => {
    const wrapper = mountAlert({}, { actions: '<button class="action-stub">处理</button>' })
    expect(wrapper.find('.ai-risk-alert__actions').exists()).toBe(true)
    expect(wrapper.find('.action-stub').exists()).toBe(true)
  })

  it('closable 省略时无关闭按钮', () => {
    const wrapper = mountAlert()
    expect(wrapper.find('.ai-risk-alert__close').exists()).toBe(false)
  })

  it('closable=true 渲染关闭按钮，点击 emit(close)', async () => {
    const wrapper = mountAlert({ closable: true })
    const closeBtn = wrapper.find('.ai-risk-alert__close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
