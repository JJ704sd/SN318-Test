import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Input as AInput } from '@arco-design/web-vue'
import AiPrefillField from './AiPrefillField.vue'

// 轻量 stub：小标只暴露 text，采纳/忽略按钮用 tooltip 定位
const stubs = {
  AiTag: { template: '<span class="ai-tag-stub">{{ text }}</span>', props: ['text', 'size'] },
  ByIconButton: {
    template: '<button class="by-icon-btn-stub" :data-tip="tooltip" @click="$emit(\'click\')"><slot /></button>',
    props: ['tooltip', 'type', 'size'],
  },
  'icon-check': true,
  'icon-close': true,
}

function mountField(props: Record<string, unknown> = {}) {
  return mount(AiPrefillField, {
    props,
    global: {
      components: { AInput },
      stubs,
    },
  })
}

function btnByTip(wrapper: ReturnType<typeof mountField>, tip: string) {
  return wrapper.findAll('.by-icon-btn-stub').find((b) => b.attributes('data-tip') === tip)!
}

describe('AiPrefillField', () => {
  it('a) 预填态：输入框显示预填值 + 填充底 + 「AI 预填」小标', () => {
    const wrapper = mountField({ prefillValue: '深圳市宝安区' })
    expect(wrapper.classes()).toContain('ai-prefill-field--pending')
    expect(wrapper.find('.ai-tag-stub').text()).toBe('AI 预填')
    expect(wrapper.findComponent(AInput).props('modelValue')).toBe('深圳市宝安区')
  })

  it('b) 采纳后 emit adopt + update:modelValue，转普通字段小标消失', async () => {
    const wrapper = mountField({ prefillValue: '空运优先' })
    await btnByTip(wrapper, '采纳').trigger('click')
    expect(wrapper.emitted('adopt')![0]).toEqual(['空运优先'])
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['空运优先'])
    expect(wrapper.classes()).not.toContain('ai-prefill-field--pending')
    // 待确认小标消失（此时为已采纳角标，文案为「已采纳」而非「AI 预填」）
    expect(wrapper.find('.ai-tag-stub').text()).toBe('已采纳')
  })

  it('c) 手动编辑后转人工录入态，pending 结束且不再显示小标', async () => {
    const wrapper = mountField({ prefillValue: 'AI 生成地址' })
    await wrapper.findComponent(AInput).vm.$emit('update:model-value', '人工改写地址')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['人工改写地址'])
    expect(wrapper.classes()).not.toContain('ai-prefill-field--pending')
    expect(wrapper.find('.ai-tag-stub').exists()).toBe(false)
  })

  it('d) 未处理预填时 pending=true，忽略后清空并 emit ignore', async () => {
    const wrapper = mountField({ prefillValue: '待确认值' })
    expect(wrapper.classes()).toContain('ai-prefill-field--pending')
    await btnByTip(wrapper, '忽略').trigger('click')
    expect(wrapper.emitted('ignore')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
    expect(wrapper.classes()).not.toContain('ai-prefill-field--pending')
  })

  it('e) 无预填值时为人工录入态，无小标', () => {
    const wrapper = mountField({ modelValue: '手填内容' })
    expect(wrapper.classes()).not.toContain('ai-prefill-field--pending')
    expect(wrapper.find('.ai-tag-stub').exists()).toBe(false)
    expect(wrapper.findComponent(AInput).props('modelValue')).toBe('手填内容')
  })

  it('f) defineExpose({ pending })：未处理时为 true，采纳后变 false（供表单校验）', async () => {
    const wrapper = mountField({ prefillValue: 'AI 预填地址' })
    expect((wrapper.vm as unknown as { pending: boolean }).pending).toBe(true)
    await btnByTip(wrapper, '采纳').trigger('click')
    expect((wrapper.vm as unknown as { pending: boolean }).pending).toBe(false)
  })
})
