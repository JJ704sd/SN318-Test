import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MessageList from './MessageList.vue'
import { useAiStore } from '@core/ai/store'
import type { AiAction, AiMessage, AiSuggestion } from '@core/ai/service/types'
import { registerAiService } from '@core/ai/service'
import { MockAiAdapter } from '@core/ai/service/MockAiAdapter'

// 子组件 stub，聚焦首条欢迎消息、列表与动作内嵌逻辑
const stubs = {
  MessageItem: {
    template:
      '<div class="msg-item-stub">{{ message.content }}<div v-if="suggestion" class="chat-suggestion-actions-stub" /></div>',
    props: ['message', 'suggestion'],
  },
  ChatStatusMessage: {
    template: '<div class="chat-status-stub" :data-status="status" />',
    props: ['status'],
  },
  AiActionBar: {
    template: '<div class="ai-action-bar-stub" :data-chat="String(chat)" />',
    props: ['chat'],
  },
}

function msg(id: string, role: AiMessage['role'], content: string): AiMessage {
  return { id, role, content, createdAt: 0 }
}

function mountList(messages: AiMessage[]) {
  return mount(MessageList, { props: { messages }, global: { stubs } })
}

const ACTION: AiAction = {
  type: 'save-form',
  payload: {},
  requireConfirm: false,
  description: '保存草稿',
}

describe('MessageList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // S4-C 起 useAiStore 依赖已注册 service；组件 spec 显式注册 Mock（等价回落时代行为）
    registerAiService(new MockAiAdapter())
  })

  it('a) 空对话将欢迎语作为运小星首条消息渲染', () => {
    const wrapper = mountList([])
    expect(wrapper.find('.msg-list__empty').exists()).toBe(false)
    expect(wrapper.findAll('.msg-item-stub')).toHaveLength(1)
    expect(wrapper.find('.msg-item-stub').text()).toContain('你好，我是运小星')
  })

  it('b) 后续消息紧随欢迎消息渲染', () => {
    const wrapper = mountList([msg('1', 'user', '你好'), msg('2', 'assistant', '在的')])
    expect(wrapper.find('.msg-list__empty').exists()).toBe(false)
    expect(wrapper.findAll('.msg-item-stub')).toHaveLength(3)
  })

  it('b1) 首次挂载后定位到最新消息，重新打开面板不会回到顶部', async () => {
    const wrapper = mountList([msg('1', 'user', '你好'), msg('2', 'assistant', '在的')])
    const scrollEl = wrapper.find('.msg-list').element
    Object.defineProperty(scrollEl, 'scrollHeight', { configurable: true, value: 640 })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(scrollEl.scrollTop).toBe(640)
    wrapper.unmount()
  })

  it('c) 无待确认动作时不内嵌 AiActionBar', () => {
    const wrapper = mountList([msg('1', 'assistant', '好的')])
    expect(wrapper.find('.ai-action-bar-stub').exists()).toBe(false)
  })

  it('d) awaitingUser 且存在 pendingAction 时末尾内嵌 AiActionBar', async () => {
    const store = useAiStore()
    const wrapper = mountList([msg('1', 'assistant', '将为你保存')])
    store.proposeAction(ACTION)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-action-bar-stub').exists()).toBe(true)
  })

  it('d1) 执行中隐藏授权卡，仅保留工具步骤状态', async () => {
    const store = useAiStore()
    store.proposeAction(ACTION)
    store.status = 'executing'
    const wrapper = mountList([msg('1', 'assistant', '将为你保存')])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-action-bar-stub').exists()).toBe(false)
    expect(wrapper.find('.chat-status-stub').attributes('data-status')).toBe('executing')
  })

  it('d2) 回复完成后先展示采纳建议操作，不提前展示授权卡', async () => {
    const store = useAiStore()
    const suggestion: AiSuggestion = {
      id: 'sg1',
      title: '保存建议',
      description: ACTION.description,
      action: ACTION,
      riskLevel: 'low',
      evidence: [],
    }
    store.chatSuggestions = { '1': suggestion }
    store.status = 'done'
    const wrapper = mountList([msg('1', 'assistant', '建议保存当前草稿')])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.chat-suggestion-actions-stub').exists()).toBe(true)
    expect(wrapper.find('.ai-action-bar-stub').exists()).toBe(false)
  })

  it('e) 请求/思考/执行/异常态用状态消息承接最新 AI 占位消息', async () => {
    const store = useAiStore()
    store.status = 'thinking'
    const wrapper = mountList([msg('1', 'user', '查一下运单'), msg('2', 'assistant', '')])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.chat-status-stub').attributes('data-status')).toBe('thinking')
    expect(wrapper.findAll('.msg-item-stub')).toHaveLength(2)
  })
})
