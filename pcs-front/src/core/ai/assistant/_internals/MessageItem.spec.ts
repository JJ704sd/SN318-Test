import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MessageItem from './MessageItem.vue'
import source from './MessageItem.vue?raw'
import type { AiMessage, AiSuggestion } from '@core/ai/service/types'

// 图标与头像在 jsdom 无意义，stub 掉
const stubs = { SvgIcon: true, AiAvatar: true }

function msg(partial: Partial<AiMessage> & Pick<AiMessage, 'role'>): AiMessage {
  return { id: 'm1', content: '你好', createdAt: 0, ...partial }
}

function mountItem(message: AiMessage) {
  return mount(MessageItem, { props: { message }, global: { stubs } })
}

const suggestion: AiSuggestion = {
  id: 'sg1',
  title: '批量更新',
  description: '批量更新运单状态',
  action: {
    type: 'batch-update',
    payload: {},
    requireConfirm: false,
    description: '批量更新运单状态',
  },
  riskLevel: 'low',
  evidence: [],
}

describe('MessageItem', () => {
  it('a) 用户消息右对齐、显示时间、无品牌角标与光标', () => {
    const wrapper = mountItem(msg({ role: 'user', content: '查一下运单' }))
    expect(wrapper.find('.msg-item--user').exists()).toBe(true)
    expect(wrapper.find('.msg-item__brand').exists()).toBe(false)
    expect(wrapper.find('.msg-item__time').exists()).toBe(true)
    expect(wrapper.find('.msg-item__cursor').exists()).toBe(false)
    expect(wrapper.find('.msg-item__text').text()).toBe('查一下运单')
  })

  it('b) AI 消息左对齐，带头像、品牌角标与时间', () => {
    const wrapper = mountItem(msg({ role: 'assistant', content: '好的' }))
    expect(wrapper.find('.msg-item--assistant').exists()).toBe(true)
    expect(wrapper.find('.msg-item__avatar').exists()).toBe(true)
    expect(wrapper.find('.msg-item__brand').text()).toContain('运小星')
    expect(wrapper.find('.msg-item__time').exists()).toBe(true)

    const assistantBubbleRules =
      source.match(
        /\.msg-item--assistant \.msg-item__bubble\s*\{(?<body>[\s\S]*?)\n\}/,
      )?.groups?.body ?? ''
    expect(assistantBubbleRules).toMatch(
      /border-radius:\s*0 var\(--border-radius-card\) var\(--border-radius-card\)/,
    )
  })

  it('c) AI 流式态显示末尾光标，非流式不显示', () => {
    const streaming = mountItem(msg({ role: 'assistant', streaming: true }))
    expect(streaming.find('.msg-item__cursor').exists()).toBe(true)

    const settled = mountItem(msg({ role: 'assistant', streaming: false }))
    expect(settled.find('.msg-item__cursor').exists()).toBe(false)
  })

  it('d) 用户消息即便 streaming 也不显示光标（光标仅属 AI 气泡）', () => {
    const wrapper = mountItem(msg({ role: 'user', streaming: true }))
    expect(wrapper.find('.msg-item__cursor').exists()).toBe(false)
  })

  it('e) AI 建议操作渲染在对应消息内部并携带消息 id', async () => {
    const message = msg({ role: 'assistant', content: '建议批量处理' })
    const wrapper = mount(MessageItem, { props: { message, suggestion }, global: { stubs } })

    const buttons = wrapper.findAll('.msg-item__suggestion button')
    expect(buttons).toHaveLength(2)
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('accept-suggestion')).toEqual([[message.id]])
    expect(wrapper.emitted('ignore-suggestion')).toEqual([[message.id]])
  })
})
