import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AiAssistantTrigger from './AiAssistantTrigger.vue'
import triggerSource from './AiAssistantTrigger.vue?raw'
import { useAiStore } from '@core/ai/store'
import { registerAiService } from '@core/ai/service'
import { MockAiAdapter } from '@core/ai/service/MockAiAdapter'

const stubs = { AiAvatar: true, 'icon-caret-right': true }

describe('AiAssistantTrigger', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    // S4-C 起 useAiStore 依赖已注册 service；组件 spec 显式注册 Mock（等价回落时代行为）
    registerAiService(new MockAiAdapter())
  })

  it('悬浮入口样式不依赖 scoped data-v，避免库构建 hash 与运行时不一致导致定位失效', () => {
    expect(AiAssistantTrigger.__scopeId).toBeUndefined()
  })

  it('点击切换助手开合', async () => {
    const store = useAiStore()
    const wrapper = mount(AiAssistantTrigger, { global: { stubs } })
    await wrapper.find('.ai-trigger__hit').trigger('click')
    expect(store.assistantOpen).toBe(true)
  })

  it('收起状态悬停头像时左侧提示保持显示', async () => {
    const wrapper = mount(AiAssistantTrigger, { global: { stubs } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.ai-trigger__bubble').text()).toBe('有问题？找运小星！')
    await wrapper.find('.ai-trigger__hit').trigger('mouseenter')
    expect(wrapper.find('.ai-trigger__bubble').text()).toBe('有问题？找运小星！')
  })

  it('数字角标相对头像右上角向下、向左各偏移 2px', () => {
    const badgeStyles = triggerSource.match(
      /\.ai-trigger__badge\s*\{(?<rules>[\s\S]*?)\n\}/,
    )?.groups?.rules

    expect(badgeStyles).toContain('top: 0;')
    expect(badgeStyles).toContain('right: 0;')
  })
})
