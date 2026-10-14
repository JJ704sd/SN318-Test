import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import ListEmptyAi from './ListEmptyAi.vue'
import type { AiSuggestion } from '@core/ai'

const mockRequestSuggestions = vi.fn<() => Promise<AiSuggestion[]>>()
vi.mock('@core/ai', async () => {
  const actual = await vi.importActual<typeof import('@core/ai')>(
    '@core/ai',
  )
  return {
    ...actual,
    useAiService: () => ({
      service: { value: { requestSuggestions: mockRequestSuggestions } },
    }),
  }
})

const EMPTY_SUGGESTION: AiSuggestion = {
  id: 'sg-empty',
  title: 'AI 原因分析',
  description: '可能因筛选条件过严导致无结果。建议放宽时间范围、清除状态或业务类型筛选后重试。',
  riskLevel: 'low',
  evidence: [
    { label: '可能原因', value: '筛选条件组合过严', source: 'AI 分析' },
  ],
}

const stubs = {
  AiTag: { template: '<span class="ai-tag-stub"><slot />{{ text }}</span>', props: ['text'] },
  AiThinkingDots: { template: '<span class="ai-thinking-stub" />' },
}

function mountEmptyAi(props: Record<string, unknown> = {}) {
  return mount(ListEmptyAi, {
    props,
    global: {
      components: { AButton },
      stubs,
    },
  })
}

describe('ListEmptyAi', () => {
  beforeEach(() => {
    mockRequestSuggestions.mockReset()
  })

  it('a) 挂载即调用 requestSuggestions 拉空态建议', async () => {
    mockRequestSuggestions.mockResolvedValue([EMPTY_SUGGESTION])
    const wrapper = mountEmptyAi()
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(mockRequestSuggestions).toHaveBeenCalledWith({ scene: 'list.empty-suggestion' })
    expect(wrapper.find('.list-empty-ai__text').exists()).toBe(true)
    expect(wrapper.text()).toContain('AI 建议：')
    expect(wrapper.text()).toContain('可能因筛选条件过严')
  })

  it('b) 加载中显示思考态', async () => {
    mockRequestSuggestions.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50))
      return [EMPTY_SUGGESTION]
    })
    const wrapper = mountEmptyAi()
    // 等 onMounted 触发 fetch（loading 置 true），但定时器未到--loading 仍为 true
    await flushPromises()
    expect(wrapper.find('.list-empty-ai__loading').exists()).toBe(true)
    await new Promise((r) => setTimeout(r, 100))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.list-empty-ai__loading').exists()).toBe(false)
  })

  it('c) 失败显示错误 + 重试按钮，点重试再拉', async () => {
    mockRequestSuggestions.mockRejectedValueOnce(new Error('AI 分析超时'))
    const wrapper = mountEmptyAi()
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.list-empty-ai__error').exists()).toBe(true)
    expect(wrapper.text()).toContain('重试')
    mockRequestSuggestions.mockResolvedValueOnce([EMPTY_SUGGESTION])
    await wrapper.find('.list-empty-ai__error button').trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(mockRequestSuggestions).toHaveBeenCalledTimes(2)
  })

  it('d) hasActiveFilter=false 时隐藏「一键放宽」按钮', async () => {
    mockRequestSuggestions.mockResolvedValue([EMPTY_SUGGESTION])
    const wrapper = mountEmptyAi({ hasActiveFilter: false })
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.list-empty-ai__relax').exists()).toBe(false)
  })

  it('e) hasActiveFilter=true 时显示「一键放宽」按钮，点击 emit relax', async () => {
    mockRequestSuggestions.mockResolvedValue([EMPTY_SUGGESTION])
    const wrapper = mountEmptyAi({ hasActiveFilter: true })
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    const btn = wrapper.find('.list-empty-ai__relax')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(wrapper.emitted('relax')).toBeTruthy()
  })

  it('f) 无可执行动作（只读型建议红线）', async () => {
    mockRequestSuggestions.mockResolvedValue([EMPTY_SUGGESTION])
    const wrapper = mountEmptyAi({ hasActiveFilter: true })
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    // 只读建议不应渲染任何执行/确认按钮，只有「一键放宽」一个按钮（且是 emit relax，非执行）
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(1)
    expect(buttons[0]!.text()).toBe('一键放宽筛选')
  })
})
