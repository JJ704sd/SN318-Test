import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { Button as AButton } from '@arco-design/web-vue'
import AiActionBar from './AiActionBar.vue'
import { useAiStore } from '@core/ai/store'
import type {
  AiAction,
  AiActionResult,
  AiSendMessageOptions,
  AiSendMessageResult,
  AiSuggestion,
  AiSuggestionRequest,
} from '@core/ai/service/types'

// 隔离服务：confirmExecute 走 mockService，避免真实执行副作用
const { mockService } = vi.hoisted(() => ({
  mockService: {
    sendMessage: vi.fn<(options: AiSendMessageOptions) => Promise<AiSendMessageResult>>(),
    requestSuggestions: vi.fn<(request: AiSuggestionRequest) => Promise<AiSuggestion[]>>(),
    confirmAndExecute: vi.fn<(action: AiAction) => Promise<AiActionResult>>(),
  },
}))
vi.mock('@core/ai/service', () => ({ getAiService: () => mockService }))

// 二次确认 / 轻提示 mock，可断言调用与控制 danger 分支返回
const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn<() => Promise<boolean>>() }))
vi.mock('@core/components/feedback', () => ({
  confirmAction: confirmMock,
  successMsg: vi.fn<() => void>(),
}))

const LOW_ACTION: AiAction = {
  type: 'save-form',
  payload: {},
  requireConfirm: false,
  description: '保存当前表单草稿',
}
const HIGH_ACTION: AiAction = {
  type: 'batch-update-status',
  payload: { count: 128 },
  requireConfirm: true,
  description: '批量将 128 条运单状态修改为「已发货」',
}

function suggestionOf(action: AiAction, riskLevel: AiSuggestion['riskLevel']): AiSuggestion {
  return {
    id: 's1',
    title: '批量发货建议',
    description: action.description,
    action,
    riskLevel,
    evidence: [
      { label: '近 30 天运单量', value: '128 条', source: '运单统计表' },
      { label: '待发货占比', value: '92%' },
    ],
  }
}

const stubs = {
  AiTag: { template: '<span class="ai-tag-stub">{{ text }}</span>', props: ['text', 'size'] },
  'icon-check': true,
}

function mountBar(props: Record<string, unknown> = {}) {
  return mount(AiActionBar, {
    props,
    global: { components: { AButton }, stubs },
  })
}

describe('AiActionBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockService.confirmAndExecute.mockReset().mockResolvedValue({ success: true, data: {} })
    confirmMock.mockReset()
  })

  it('a) pendingAction 为 null 时不渲染', () => {
    const wrapper = mountBar()
    expect(wrapper.find('.ai-action-bar').exists()).toBe(false)
  })

  it('b) pendingAction 存在才显示动作说明', () => {
    const store = useAiStore()
    store.suggestions = [suggestionOf(LOW_ACTION, 'low')]
    store.proposeAction(LOW_ACTION)
    const wrapper = mountBar()
    expect(wrapper.find('.ai-action-bar').exists()).toBe(true)
    expect(wrapper.find('.ai-action-bar__desc').text()).toBe(LOW_ACTION.description)
  })

  it('b1) chat 模式展示授权并继续的确认卡', () => {
    const store = useAiStore()
    store.proposeAction(LOW_ACTION)
    const wrapper = mountBar({ chat: true })
    expect(wrapper.classes()).toContain('ai-action-bar--chat')
    expect(wrapper.find('.ai-action-bar__desc').text()).toContain('需要你确认')
    expect(wrapper.find('.ai-action-bar__chat-desc').exists()).toBe(false)
    expect(wrapper.find('.ai-action-bar__evidence').exists()).toBe(false)
    expect(wrapper.findAll('.ai-action-bar__footer button')[0]!.text()).toContain('授权并继续')
  })

  it('c) 有 evidence 时默认折叠，点击可展开查看依据（不触发执行）', async () => {
    const store = useAiStore()
    store.suggestions = [suggestionOf(LOW_ACTION, 'low')]
    store.proposeAction(LOW_ACTION)
    const wrapper = mountBar()
    expect(wrapper.find('.ai-action-bar__evidence-list').exists()).toBe(false)
    await wrapper.find('.ai-action-bar__evidence-toggle').trigger('click')
    expect(wrapper.find('.ai-action-bar__evidence-list').exists()).toBe(true)
    expect(wrapper.findAll('.ai-action-bar__evidence-item')).toHaveLength(2)
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
  })

  it('d) 普通动作点执行直接调 confirmExecute，不弹二次确认', async () => {
    const store = useAiStore()
    store.suggestions = [suggestionOf(LOW_ACTION, 'low')]
    store.proposeAction(LOW_ACTION)
    const wrapper = mountBar()
    await wrapper.findAll('.ai-action-bar__footer button')[1]!.trigger('click')
    await flushPromises()
    expect(confirmMock).not.toHaveBeenCalled()
    expect(mockService.confirmAndExecute).toHaveBeenCalledWith(LOW_ACTION)
    expect(store.pendingAction).toBeNull()
  })

  it('e) 高风险动作先二次确认，确认后才执行', async () => {
    confirmMock.mockResolvedValue(true)
    const store = useAiStore()
    store.suggestions = [suggestionOf(HIGH_ACTION, 'high')]
    store.proposeAction(HIGH_ACTION)
    const wrapper = mountBar()
    expect(wrapper.find('.ai-action-bar--danger').exists()).toBe(true)
    await wrapper.findAll('.ai-action-bar__footer button')[1]!.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenCalled()
    expect(mockService.confirmAndExecute).toHaveBeenCalledWith(HIGH_ACTION)
  })

  it('f) 高风险动作二次确认被取消则不执行', async () => {
    confirmMock.mockResolvedValue(false)
    const store = useAiStore()
    store.suggestions = [suggestionOf(HIGH_ACTION, 'high')]
    store.proposeAction(HIGH_ACTION)
    const wrapper = mountBar()
    await wrapper.findAll('.ai-action-bar__footer button')[1]!.trigger('click')
    await flushPromises()
    expect(confirmMock).toHaveBeenCalled()
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
    expect(store.pendingAction).toEqual(HIGH_ACTION)
  })

  it('g) 取消按钮清空 pendingAction、不执行', async () => {
    const store = useAiStore()
    store.suggestions = [suggestionOf(LOW_ACTION, 'low')]
    store.proposeAction(LOW_ACTION)
    const wrapper = mountBar()
    await wrapper.findAll('.ai-action-bar__footer button')[0]!.trigger('click')
    expect(store.pendingAction).toBeNull()
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
  })
})

async function flushPromises() {
  await new Promise((r) => setTimeout(r, 0))
}
