import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { Button as AButton } from '@arco-design/web-vue'
import AiAssistantPanel from './AiAssistantPanel.vue'
import panelSource from './AiAssistantPanel.vue?raw'
import { useAiStore } from '@core/ai/store'
import type { AiStatus } from '@core/ai/store'
import type {
  AiAction,
  AiActionResult,
  AiSendMessageOptions,
  AiSendMessageResult,
  AiSuggestion,
  AiSuggestionRequest,
} from '@core/ai/service/types'

// 隔离 AI 服务：sendMessage 挂起不返回，便于断言「发送后状态切换」而不触发真实流式
const { mockService } = vi.hoisted(() => ({
  mockService: {
    sendMessage: vi.fn<(options: AiSendMessageOptions) => Promise<AiSendMessageResult>>(
      () => new Promise(() => {}),
    ),
    requestSuggestions: vi.fn<(request: AiSuggestionRequest) => Promise<AiSuggestion[]>>(),
    confirmAndExecute: vi.fn<(action: AiAction) => Promise<AiActionResult>>(),
  },
}))
vi.mock('@core/ai/service', () => ({ getAiService: () => mockService }))

// 子组件与雪碧图 stub，聚焦面板自身的显隐/发送-停止/转发逻辑
const stubs = {
  SvgIcon: true,
  'icon-close': true,
  'icon-arrow-up': true,
  Teleport: { template: '<div><slot /></div>' },
  MessageList: { template: '<div class="msg-list-stub" />', props: ['messages'] },
  QuickAskBar: {
    name: 'QuickAskBarStub',
    template:
      '<div class="quick-ask-stub" :data-disabled="disabled" @click="$emit(\'ask\', \'追问X\')" />',
    props: ['items', 'disabled'],
    emits: ['ask'],
  },
}

function mountPanel() {
  return mount(AiAssistantPanel, { global: { components: { AButton }, stubs } })
}

describe('AiAssistantPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockService.sendMessage.mockClear()
    document.documentElement.classList.remove('ai-assistant-open')
    document.body.classList.remove('ai-assistant-open')
  })

  it('a) assistantOpen=false 时不渲染面板', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.ai-panel').exists()).toBe(false)
  })

  it('b) assistantOpen=true 时渲染面板', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-panel').exists()).toBe(true)
  })

  it('b9) 打开面板后自动聚焦输入框', async () => {
    const store = useAiStore()
    const wrapper = mount(AiAssistantPanel, {
      attachTo: document.body,
      global: { components: { AButton }, stubs },
    })

    store.assistantOpen = true
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(wrapper.find('input').element)
    wrapper.unmount()
  })

  it('b4) 背景图为助手面板私有资源：tokens.css 不含 AI 图片，面板经 asset import 注入', () => {
    const tokensSource = readFileSync(resolve(process.cwd(), 'src/core/styles/tokens.css'), 'utf8')
    expect(tokensSource).not.toContain('--ai-panel-bg-image')
    expect(tokensSource).not.toContain('bg_ai')
    // 面板私有：js 侧资产 import + css 用组件级变量引用（无全局 token）
    expect(panelSource).toContain("aiPanelBg from '../../assets/bg_ai.png'")
    expect(panelSource).toContain('background-image: var(--ai-panel-bg-image)')
  })

  it('b4a) 背景图按面板宽度等比缩放，不随面板高度拉伸', () => {
    const panelRules =
      panelSource.match(/\.ai-panel\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(panelRules).toMatch(/background-size:\s*100%\s+auto/)
    expect(panelRules).not.toMatch(/background-size:\s*cover/)
  })

  it('b5) 对话框贴齐上、下、右且无圆角，呈抽屉形态', () => {
    const rules = panelSource.match(/\.ai-panel\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(rules).toMatch(/top:\s*0;/)
    expect(rules).toMatch(/right:\s*0;/)
    expect(rules).toMatch(/bottom:\s*0;/)
    expect(rules).not.toContain('border-radius')
  })

  it('b6) 输入区白底，composer 无内边距', () => {
    const inputRules =
      panelSource.match(/\.ai-panel__input\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(inputRules).toMatch(/background-color:\s*var\(--color-bg-card\)/)

    const composerRules =
      panelSource.match(/\.ai-panel__composer\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(composerRules).not.toMatch(/padding:\s*var\(/)
    expect(composerRules).not.toMatch(/border:\s/)
  })

  it('b7) 输入框圆角为 --border-radius-default（8px）', () => {
    const fieldRules =
      panelSource.match(/\.ai-panel__field\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(fieldRules).toMatch(/border-radius:\s*var\(--border-radius-default\)/)
  })

  it('b8) 输入文字在框内垂直居中', () => {
    const inputRules =
      panelSource.match(
        /\.ai-panel__field input(?:,\s*\.ai-panel__field input:disabled)?\s*\{(?<body>[\s\S]*?)\n\}/,
      )?.groups?.body ?? ''
    expect(inputRules).toMatch(/height:\s*100%/)
    expect(inputRules).toMatch(/line-height:\s*var\(--size-icon-btn\)/)
    expect(inputRules).toMatch(/translateY\(-1px\)/)
  })

  it('b1) 打开时传送到页面根部，避免受业务布局裁切', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const { Teleport: _teleport, ...stubsWithoutTeleport } = stubs
    const wrapper = mount(AiAssistantPanel, {
      attachTo: document.body,
      global: { components: { AButton }, stubs: stubsWithoutTeleport },
    })
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.ai-panel')).not.toBeNull()
    wrapper.unmount()
  })

  it('b2) 先挂载再打开时，对话框出现在 body 且不停留在离屏进入态', async () => {
    const store = useAiStore()
    const { Teleport: _teleport, ...stubsWithoutTeleport } = stubs
    const wrapper = mount(AiAssistantPanel, {
      attachTo: document.body,
      global: { components: { AButton }, stubs: stubsWithoutTeleport },
    })
    expect(document.body.querySelector('.ai-panel')).toBeNull()

    store.assistantOpen = true
    await wrapper.vm.$nextTick()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )

    const panel = document.body.querySelector('.ai-panel')
    expect(panel).not.toBeNull()
    expect(panel?.className).not.toContain('ai-panel-enter-from')
    expect(getComputedStyle(panel!).opacity).not.toBe('0')

    wrapper.unmount()
  })

  it('b3) 对话浮层样式不依赖 scoped data-v，避免 Teleport 后选择器失效', () => {
    expect(AiAssistantPanel.__scopeId).toBeUndefined()
  })

  it('b10) 打开时锁定页面滚动，关闭后恢复页面滚动', async () => {
    const store = useAiStore()
    const wrapper = mountPanel()

    expect(document.documentElement.classList.contains('ai-assistant-open')).toBe(false)
    expect(document.body.classList.contains('ai-assistant-open')).toBe(false)

    store.assistantOpen = true
    await wrapper.vm.$nextTick()
    expect(document.documentElement.classList.contains('ai-assistant-open')).toBe(true)
    expect(document.body.classList.contains('ai-assistant-open')).toBe(true)

    store.assistantOpen = false
    await wrapper.vm.$nextTick()
    expect(document.documentElement.classList.contains('ai-assistant-open')).toBe(false)
    expect(document.body.classList.contains('ai-assistant-open')).toBe(false)

    wrapper.unmount()
  })

  it('b11) 打开时渲染页面遮罩，点击遮罩关闭面板', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()

    expect(panelSource).toContain('<transition name="fade-drawer">')
    expect(wrapper.find('.ai-panel__overlay').exists()).toBe(true)
    await wrapper.find('.ai-panel__overlay').trigger('click')
    expect(store.assistantOpen).toBe(false)
  })

  it('c) 关闭按钮调 toggleAssistant', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const spy = vi.spyOn(store, 'toggleAssistant')
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    await wrapper.find('.ai-panel__close').trigger('click')
    expect(spy).toHaveBeenCalled()
  })

  it('d) 空输入不发送', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    await wrapper.find('.ai-panel__action--send').trigger('click')
    expect(mockService.sendMessage).not.toHaveBeenCalled()
  })

  it('d1) 空闲时胶囊输入占位为「请描述你的问题」，动作为圆形发送', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('input').attributes('placeholder')).toBe('请描述你的问题')
    expect(wrapper.find('.ai-panel__action--send').attributes('aria-label')).toBe('发送')
    expect(wrapper.find('.ai-panel__action--stop').exists()).toBe(false)
  })

  it('d3) 输入外包为 div，空内容时发送钮仍可点', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-panel__field').element.tagName).toBe('DIV')
    expect(wrapper.find('.ai-panel__field input').exists()).toBe(true)
    expect(wrapper.find('.ai-panel__action--send').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.ai-panel__action--send').classes()).not.toContain('arco-btn-disabled')
  })

  it('d2) 发送/停止为仅图标圆钮固定 --size-icon-btn，输入框吃剩余宽度', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-panel__action--send').classes()).toContain('arco-btn-only-icon')

    store.status = 'streaming' as AiStatus
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ai-panel__action--stop').classes()).toContain('arco-btn-only-icon')

    const fieldRules =
      panelSource.match(/\.ai-panel__field\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(fieldRules).toMatch(/flex:\s*1/)

    const actionRules =
      panelSource.match(
        /\.ai-panel__composer \.ai-panel__action\.arco-btn(?:\.arco-btn-size-medium)?\s*\{(?<body>[\s\S]*?)\n\}/,
      )?.groups?.body ?? ''
    expect(actionRules).toMatch(/flex:\s*0 0 var\(--size-icon-btn\)/)
    expect(actionRules).toMatch(/max-width:\s*var\(--size-icon-btn\)/)
  })

  it('e) 有内容点发送调 store.sendMessage 并清空输入', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    await wrapper.find('input').setValue('查一下运单 SF123')
    await wrapper.find('.ai-panel__action--send').trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockService.sendMessage).toHaveBeenCalled()
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('f) 生成中输入占位为「AI 正在回复...」，圆形停止按钮点击调 store.abort', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    store.status = 'streaming' as AiStatus
    const spy = vi.spyOn(store, 'abort')
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('input').attributes('placeholder')).toBe('AI 正在回复...')
    const btn = wrapper.find('.ai-panel__action--stop')
    expect(btn.attributes('aria-label')).toBe('停止')
    expect(wrapper.find('.ai-panel__action--send').exists()).toBe(false)

    const stopRules =
      panelSource.match(
        /\.ai-panel__composer \.ai-panel__action--stop\.arco-btn,\s*\n\.ai-panel__composer \.ai-panel__action--stop\.arco-btn\[type='button'\]\s*\{(?<body>[\s\S]*?)\n\}/,
      )?.groups?.body ?? ''
    expect(stopRules).toMatch(/background-color:\s*var\(--color-bg-page\)/)

    await btn.trigger('click')
    expect(spy).toHaveBeenCalled()
  })

  it('g) 快捷追问 emit ask 时转发到 store.sendMessage', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    await wrapper.find('.quick-ask-stub').trigger('click')
    expect(mockService.sendMessage).toHaveBeenCalled()
  })

  it('g1) 状态快捷项覆盖全部可见状态，点击后直接切换预览', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    const bar = wrapper.findComponent({ name: 'QuickAskBarStub' })
    const items = bar.props('items') as Array<{ label: string; value: string }>

    expect(items.slice(0, 11).map((item) => item.label)).toEqual([
      '请求中',
      '思考中',
      '生成中',
      '完成',
      '执行中',
      '等待确认',
      '已停止',
      '网络超时',
      '服务器超时',
      '模型超时',
      '失败',
    ])

    bar.vm.$emit('ask', 'status-preview:requesting')
    await wrapper.vm.$nextTick()
    expect(store.status).toBe('requesting')

    bar.vm.$emit('ask', 'status-preview:awaitingUser')
    await wrapper.vm.$nextTick()
    expect(store.status).toBe('awaitingUser')
    expect(store.pendingAction).not.toBeNull()
  })

  it('h) 真实生成中禁用全部快捷项', async () => {
    const store = useAiStore()
    store.assistantOpen = true
    store.status = 'thinking' as AiStatus
    const wrapper = mountPanel()
    await wrapper.vm.$nextTick()
    const items = wrapper.findComponent({ name: 'QuickAskBarStub' }).props('items') as Array<{
      disabled: boolean
    }>
    expect(items.every((item) => item.disabled)).toBe(true)
  })
})
