import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Button as AButton, Input as AInput } from '@arco-design/web-vue'
import AiNlFilter from './AiNlFilter.vue'
import type { AiSuggestion } from '@core/ai/service/types'

// mock service：requestSuggestions 返回预设建议
const mockRequestSuggestions = vi.fn<() => Promise<AiSuggestion[]>>()
vi.mock('@core/ai/service/useAiService', () => ({
  useAiService: () => ({
    service: { value: { requestSuggestions: mockRequestSuggestions } },
  }),
}))

const COND_SUGGESTION: AiSuggestion = {
  id: 'sg-nl-filter',
  title: 'AI 解析结果',
  description: '已理解筛选意图：空运 · 异常',
  riskLevel: 'low',
  evidence: [
    { label: '业务类型', value: '空运', source: 'AI 解析' },
    { label: '状态', value: '异常', source: 'AI 解析' },
  ],
  action: {
    type: 'apply-filter',
    payload: { bizType: 'air', status: 'exception' },
    requireConfirm: false,
    description: '应用 AI 解析的筛选条件',
  },
}

const stubs = {
  SvgIcon: true,
  AiTag: { template: '<span class="ai-tag-stub"><slot />{{ text }}</span>', props: ['text'] },
  AiActiveContainer: { template: '<div class="ai-active-stub"><slot /></div>' },
  AiThinkingDots: { template: '<span class="ai-thinking-stub" />' },
}

function mountFilter() {
  return mount(AiNlFilter, {
    global: {
      components: { AButton, AInput },
      stubs,
    },
  })
}

describe('AiNlFilter', () => {
  beforeEach(() => {
    mockRequestSuggestions.mockReset()
  })

  it('a) 空输入时解析按钮禁用', () => {
    const wrapper = mountFilter()
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('b) 输入文本点解析 -> 调 requestSuggestions 并显示思考态', async () => {
    mockRequestSuggestions.mockImplementation(async () => {
      // 模拟思考延迟，让思考态有机会渲染
      await new Promise((r) => setTimeout(r, 10))
      return [COND_SUGGESTION]
    })
    const wrapper = mountFilter()
    await wrapper.find('input').setValue('空运异常单')
    await wrapper.find('button').trigger('click')
    // 思考态出现
    expect(wrapper.find('.ai-active-stub').exists()).toBe(true)
    expect(mockRequestSuggestions).toHaveBeenCalledWith({
      scene: 'list.nl-filter',
      context: { text: '空运异常单' },
    })
    // 等待解析完成
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-nl-filter__result').exists()).toBe(true)
  })

  it('c) 解析成功 -> emit parsed（携带结构化条件），不直接执行查询', async () => {
    mockRequestSuggestions.mockResolvedValue([COND_SUGGESTION])
    const wrapper = mountFilter()
    await wrapper.find('input').setValue('空运异常单')
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('parsed')).toBeTruthy()
    expect(wrapper.emitted('parsed')![0]).toEqual([{ bizType: 'air', status: 'exception' }])
  })

  it('d) 解析失败 -> 显示错误 + 重试按钮', async () => {
    mockRequestSuggestions.mockRejectedValue(new Error('AI 解析超时'))
    const wrapper = mountFilter()
    await wrapper.find('input').setValue('空运异常单')
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-nl-filter__error').exists()).toBe(true)
    expect(wrapper.text()).toContain('重试')
  })

  it('e) 解析结果以条件 Tag 展示（业务类型 / 状态）', async () => {
    mockRequestSuggestions.mockResolvedValue([COND_SUGGESTION])
    const wrapper = mountFilter()
    await wrapper.find('input').setValue('空运异常单')
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    const tags = wrapper.findAll('.ai-nl-filter__tag')
    expect(tags.length).toBe(2)
    expect(tags[0]!.text()).toContain('业务类型')
    expect(tags[0]!.text()).toContain('空运')
    expect(tags[1]!.text()).toContain('状态')
    expect(tags[1]!.text()).toContain('异常')
  })

  it('f) 点「清除」-> emit clear 并清空解析结果', async () => {
    mockRequestSuggestions.mockResolvedValue([COND_SUGGESTION])
    const wrapper = mountFilter()
    await wrapper.find('input').setValue('空运异常单')
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    await wrapper.find('.ai-nl-filter__clear').trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
    expect(wrapper.find('.ai-nl-filter__result').exists()).toBe(false)
  })
})
