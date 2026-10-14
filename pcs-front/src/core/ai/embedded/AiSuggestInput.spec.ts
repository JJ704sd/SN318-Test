import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { Button as AButton } from '@arco-design/web-vue'
import AiSuggestInput from './AiSuggestInput.vue'
import { useAiStore } from '@core/ai/store'
import type { AiSuggestion } from '@core/ai/service/types'
import { registerAiService } from '@core/ai/service'
import { MockAiAdapter } from '@core/ai/service/MockAiAdapter'

const SAMPLE: AiSuggestion[] = [
  { id: 's1', title: '推荐渠道', description: '空运优先', riskLevel: 'low', evidence: [] },
]

// 带 action.payload.field 的建议样本，用于测试 field 过滤（任务 5.7）
const FIELD_SAMPLES: AiSuggestion[] = [
  {
    id: 's-dest',
    title: '推荐目的地',
    description: '洛杉矶',
    riskLevel: 'low',
    evidence: [],
    action: {
      type: 'fill-form-field',
      payload: { field: 'destination', value: '美国 · 洛杉矶' },
      requireConfirm: false,
      description: '填目的地',
    },
  },
  {
    id: 's-consignee',
    title: '建议收件人',
    description: '张明',
    riskLevel: 'low',
    evidence: [],
    action: {
      type: 'fill-form-field',
      payload: { field: 'consignee', value: '张明' },
      requireConfirm: false,
      description: '填收件人',
    },
  },
]

// 轻量 stub，避免依赖雪碧图与 Arco 图标
const stubs = {
  SvgIcon: true,
  'icon-close': true,
  AiTag: { template: '<span class="ai-tag-stub"><slot />{{ text }}</span>', props: ['text'] },
  ByEmpty: { template: '<div class="by-empty-stub" />', props: ['preset', 'size', 'title'] },
  'a-spin': { template: '<div class="a-spin-stub" />' },
}

function mountInput(props: Record<string, unknown> = {}) {
  return mount(AiSuggestInput, {
    props: { scene: 'form.waybill', ...props },
    global: {
      components: { AButton },
      stubs,
    },
    slots: { default: '<input class="field" />' },
  })
}

describe('AiSuggestInput', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    // S4-C 起 useAiStore 依赖已注册 service；组件 spec 显式注册 Mock（等价回落时代行为）
    registerAiService(new MockAiAdapter())
    const store = useAiStore()
    // fetchSuggestions 直接把预设塞进 store.suggestions
    fetchSpy = vi.fn<() => Promise<void>>(async () => {
      store.suggestions = SAMPLE
    })
    store.fetchSuggestions = fetchSpy as unknown as typeof store.fetchSuggestions
  })

  it('a) 点击触发按钮调用 fetchSuggestions 并展开建议', async () => {
    const wrapper = mountInput()
    await wrapper.find('.ai-suggest-input__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(fetchSpy).toHaveBeenCalledWith('form.waybill', undefined)
    expect(wrapper.find('.ai-suggest-input__list').exists()).toBe(true)
  })

  it('b) 点采纳才 emit apply（携带建议）', async () => {
    const wrapper = mountInput()
    await wrapper.find('.ai-suggest-input__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    const applyBtn = wrapper.findAll('.ai-suggest-input__item button')
    await applyBtn[0]!.trigger('click')
    expect(wrapper.emitted('apply')).toBeTruthy()
    expect(wrapper.emitted('apply')![0]).toEqual([SAMPLE[0]])
  })

  it('c) 未点采纳不 emit apply（红线：不自动填入）', async () => {
    const wrapper = mountInput()
    await wrapper.find('.ai-suggest-input__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('apply')).toBeFalsy()
  })

  it('d) 主动浮现条件满足时自动展示气泡并拉取', async () => {
    const wrapper = mountInput({ proactive: true })
    await wrapper.vm.$nextTick()
    expect(fetchSpy).toHaveBeenCalled()
    expect(wrapper.find('.ai-suggest-input__panel').exists()).toBe(true)
  })

  it('e) 关闭后 emit dismiss 且不再主动浮现', async () => {
    const wrapper = mountInput({ proactive: true })
    await wrapper.vm.$nextTick()
    await wrapper.find('.ai-suggest-input__close').trigger('click')
    expect(wrapper.emitted('dismiss')).toBeTruthy()
    expect(wrapper.find('.ai-suggest-input__panel').exists()).toBe(false)
    // 已忽略态：不再展示气泡
    expect(wrapper.find('.ai-suggest-input__dismissed').exists()).toBe(true)
  })

  it('f) 已忽略态渲染提示行，重新查看可再次展开', async () => {
    const wrapper = mountInput({ proactive: true })
    await wrapper.vm.$nextTick()
    await wrapper.find('.ai-suggest-input__close').trigger('click')
    expect(wrapper.find('.ai-suggest-input__dismissed-text').text()).toBe('已忽略 AI 建议')
    // 点「重新查看」
    await wrapper.find('.ai-suggest-input__dismissed button').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-suggest-input__panel').exists()).toBe(true)
    expect(wrapper.find('.ai-suggest-input__dismissed').exists()).toBe(false)
  })

  it('g) 传 field 时仅展示 action.payload.field 匹配的建议', async () => {
    const store = useAiStore()
    store.suggestions = FIELD_SAMPLES
    // 改为 noop，避免覆盖预设的 FIELD_SAMPLES
    store.fetchSuggestions = async () => {}
    const wrapper = mountInput({ field: 'destination' })
    await wrapper.find('.ai-suggest-input__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.ai-suggest-input__item')
    expect(items).toHaveLength(1)
    expect(wrapper.find('.ai-suggest-input__item-title').text()).toBe('推荐目的地')
  })

  it('h) 传 field 但无匹配建议时展示空态', async () => {
    const store = useAiStore()
    store.suggestions = FIELD_SAMPLES
    store.fetchSuggestions = async () => {}
    const wrapper = mountInput({ field: 'unknown-field' })
    await wrapper.find('.ai-suggest-input__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-suggest-input__list').exists()).toBe(false)
    expect(wrapper.find('.by-empty-stub').exists()).toBe(true)
  })
})
